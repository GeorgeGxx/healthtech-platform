import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createPublicKey, verify, type KeyObject } from 'node:crypto';
import { IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators.js';

interface JwkKey {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
}

interface JwtPayload {
  sub?: string;
  exp?: number;
  iss?: string;
  preferred_username?: string;
  email?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
}

const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedKeys: Map<string, KeyObject> = new Map();
let cachedAt = 0;

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  private readonly logger = new Logger(KeycloakAuthGuard.name);

  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const token = this.extractToken(req);

    if (token) {
      const payload = await this.verifyJwt(token);
      const roles = this.extractRoles(payload);
      req.user = {
        sub: payload.sub ?? 'unknown',
        username: payload.preferred_username ?? payload.sub ?? 'unknown',
        email: payload.email,
        roles,
      };
    } else {
      const forceAuth = String(req.headers?.['x-require-auth'] ?? '').toLowerCase() === 'true';
      const devAuthEnabled = process.env.DEV_AUTH_ENABLED !== 'false' && process.env.NODE_ENV !== 'production';

      if (!devAuthEnabled || forceAuth) {
        throw new UnauthorizedException('Bearer JWT token required (Keycloak OIDC)');
      }

      const rawRoles = req.headers?.['x-user-roles'];
      const roles = typeof rawRoles === 'string' && rawRoles.trim().length > 0
        ? rawRoles.split(',').map((r: string) => r.trim()).filter(Boolean)
        : ['admin_user', 'doctor_user'];

      req.user = {
        sub: 'dev-local-user',
        username: String(req.headers?.['x-user-id'] ?? 'dev-user'),
        roles,
      };
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles: string[] = req.user?.roles ?? [];
      const hasRole = requiredRoles.some((role) => userRoles.includes(role));
      if (!hasRole) {
        throw new ForbiddenException(
          `Access denied. One of the following roles is required: [${requiredRoles.join(', ')}]`,
        );
      }
    }

    return true;
  }

  private extractToken(req: any): string | null {
    const authHeader = req.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    const queryToken = req.query?.token;
    if (typeof queryToken === 'string' && queryToken.split('.').length === 3) {
      return queryToken.trim();
    }
    return null;
  }

  private extractRoles(payload: JwtPayload): string[] {
    const realmRoles = payload.realm_access?.roles ?? [];
    const clientRoles = Object.values(payload.resource_access ?? {}).flatMap(
      (entry) => entry.roles ?? [],
    );
    return Array.from(new Set([...realmRoles, ...clientRoles]));
  }

  private async verifyJwt(token: string): Promise<JwtPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid JWT format');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    let header: { kid?: string; alg?: string };
    let payload: JwtPayload;

    try {
      header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Malformed JWT');
    }

    if (header.alg !== 'RS256') {
      throw new UnauthorizedException(`Unsupported JWT algorithm: ${header.alg ?? 'none'}`);
    }

    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() - 30_000) {
      throw new UnauthorizedException('Expired JWT token');
    }

    const key = await this.getSigningKey(header.kid);
    const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8');
    const signature = Buffer.from(encodedSignature, 'base64url');

    const valid = verify('RSA-SHA256', signingInput, key, signature);
    if (!valid) {
      throw new UnauthorizedException('Invalid JWT signature');
    }

    return payload;
  }

  private async getSigningKey(kid?: string): Promise<KeyObject> {
    if (!kid) {
      throw new UnauthorizedException('JWT missing key identifier (kid)');
    }

    const now = Date.now();
    if (cachedKeys.has(kid) && now - cachedAt < JWKS_CACHE_TTL_MS) {
      return cachedKeys.get(kid)!;
    }

    await this.refreshJwks();
    const key = cachedKeys.get(kid);
    if (!key) {
      throw new UnauthorizedException(`JWKS public key not found for kid=${kid}`);
    }
    return key;
  }

  private async refreshJwks(): Promise<void> {
    const jwksUrl =
      process.env.KEYCLOAK_JWKS_URL ||
      'http://keycloak:8080/realms/healthtech-realm/protocol/openid-connect/certs';

    try {
      const response = await fetch(jwksUrl, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as { keys?: JwkKey[] };
      const nextMap = new Map<string, KeyObject>();

      for (const jwk of data.keys ?? []) {
        if (jwk.kid && jwk.kty === 'RSA' && jwk.n && jwk.e) {
          const publicKey = createPublicKey({
            key: { kty: 'RSA', n: jwk.n, e: jwk.e },
            format: 'jwk',
          });
          nextMap.set(jwk.kid, publicKey);
        }
      }

      if (nextMap.size > 0) {
        cachedKeys = nextMap;
        cachedAt = Date.now();
      }
    } catch (err: any) {
      this.logger.warn(`Failed to fetch JWKS from ${jwksUrl}: ${err?.message ?? err}`);
      if (cachedKeys.size === 0) {
        throw new UnauthorizedException('Keycloak identity service unavailable to validate JWT');
      }
    }
  }
}
