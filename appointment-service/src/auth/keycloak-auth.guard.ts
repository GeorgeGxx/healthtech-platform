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
import { AuthenticatedUser, IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators.js';

interface JwkKey {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
}

export interface JwtPayload {
  sub?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
  azp?: string;
  preferred_username?: string;
  email?: string;
  patient_id?: number | string;
  doctor_id?: number | string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
}

const ALG_TO_NODE_VERIFY: Record<string, string> = {
  RS256: 'RSA-SHA256',
  RS384: 'RSA-SHA384',
  RS512: 'RSA-SHA512',
};

const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;
const JWKS_MAX_STALE_MS = 15 * 60 * 1000;
const JWKS_FORCE_REFRESH_COOLDOWN_MS = 10 * 1000;
const DEFAULT_CLOCK_SKEW_SECONDS = 30;

let cachedKeys: Map<string, KeyObject> = new Map();
let cachedAt = 0;
let lastForcedRefreshAt = 0;
let refreshInFlight: Promise<void> | null = null;

/** Reset JWKS cache — intended for unit tests only. */
export function resetJwksCacheForTests(): void {
  cachedKeys = new Map();
  cachedAt = 0;
  lastForcedRefreshAt = 0;
  refreshInFlight = null;
}

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
    const token = this.extractBearerToken(req);

    if (token) {
      const payload = await this.verifyJwt(token);
      if (!payload.sub) {
        throw new UnauthorizedException('JWT missing subject (sub)');
      }
      const roles = this.extractRoles(payload);
      const user: AuthenticatedUser = {
        sub: payload.sub,
        username: payload.preferred_username ?? payload.sub,
        email: payload.email,
        roles,
        azp: payload.azp,
        patientId:
          payload.patient_id !== undefined && Number.isFinite(Number(payload.patient_id))
            ? Number(payload.patient_id)
            : undefined,
        doctorId:
          payload.doctor_id !== undefined && Number.isFinite(Number(payload.doctor_id))
            ? Number(payload.doctor_id)
            : undefined,
      };
      req.user = user;
    } else {
      req.user = this.authenticateLocalDevOrFail(req);
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

  /**
   * Local-only development fallback. Strictly impossible to activate in staging/production
   * or when DEV_AUTH_ENABLED !== 'true'. Never grants implicit admin or doctor privileges.
   */
  private authenticateLocalDevOrFail(req: any): AuthenticatedUser {
    const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
    const isLocalEnv = nodeEnv === 'development' || nodeEnv === 'test';
    const devAuthExplicitlyEnabled = process.env.DEV_AUTH_ENABLED === 'true';
    const forceAuth = String(req.headers?.['x-require-auth'] ?? '').toLowerCase() === 'true';

    if (!isLocalEnv || !devAuthExplicitlyEnabled || forceAuth) {
      throw new UnauthorizedException('Bearer JWT token required (Keycloak OIDC)');
    }

    const rawRoles = req.headers?.['x-user-roles'];
    const roles =
      typeof rawRoles === 'string' && rawRoles.trim().length > 0
        ? rawRoles
            .split(',')
            .map((r: string) => r.trim())
            .filter(Boolean)
        : ['basic_user'];

    const rawUserId = typeof req.headers?.['x-user-id'] === 'string' && req.headers['x-user-id'].trim()
      ? req.headers['x-user-id'].trim()
      : 'dev-local-user';

    return {
      sub: rawUserId,
      username: rawUserId,
      roles,
    };
  }

  /**
   * Extracts Bearer token strictly from the Authorization header.
   * Query-string tokens are intentionally rejected to prevent token leakage in logs/referrers.
   */
  private extractBearerToken(req: any): string | null {
    const authHeader = req.headers?.authorization;
    if (typeof authHeader !== 'string') {
      return null;
    }
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    return match ? match[1].trim() : null;
  }

  private extractRoles(payload: JwtPayload): string[] {
    const realmRoles = payload.realm_access?.roles ?? [];
    const allowedClients = this.getAllowedRoleClients();
    const clientRoles: string[] = [];

    if (payload.resource_access) {
      for (const [clientId, entry] of Object.entries(payload.resource_access)) {
        if (allowedClients.has(clientId) && Array.isArray(entry?.roles)) {
          clientRoles.push(...entry.roles);
        }
      }
    }

    return Array.from(new Set([...realmRoles, ...clientRoles]));
  }

  private getAllowedRoleClients(): Set<string> {
    const configured = process.env.KEYCLOAK_ROLE_CLIENTS ?? 'healthtech-platform,healthtech-backend';
    return new Set(
      configured
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    );
  }

  private getAllowedAlgs(): Set<string> {
    const configured = process.env.JWT_ALLOWED_ALGS ?? 'RS256';
    const algs = configured
      .split(',')
      .map((a) => a.trim().toUpperCase())
      .filter((a) => a in ALG_TO_NODE_VERIFY);
    return new Set(algs.length > 0 ? algs : ['RS256']);
  }

  private getAllowedIssuers(): Set<string> {
    const explicit = process.env.KEYCLOAK_ALLOWED_ISSUERS ?? process.env.KEYCLOAK_ISSUER;
    if (explicit && explicit.trim().length > 0) {
      return new Set(
        explicit
          .split(',')
          .map((i) => i.trim().replace(/\/+$/, ''))
          .filter(Boolean),
      );
    }

    const realm = process.env.KEYCLOAK_REALM || 'healthtech-realm';
    const jwksUrl = this.getJwksUrl();
    const issuers = new Set<string>();
    try {
      const parsed = new URL(jwksUrl);
      issuers.add(`${parsed.origin}/realms/${realm}`);
    } catch {
      // Fallback ignored; issuers checked below
    }

    const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
    if (nodeEnv !== 'production' && nodeEnv !== 'staging') {
      issuers.add(`http://keycloak:8080/realms/${realm}`);
      issuers.add(`http://localhost:8080/realms/${realm}`);
      issuers.add(`http://localhost:8000/realms/${realm}`);
    }
    return issuers;
  }

  private getAllowedAudiences(): Set<string> {
    const configured =
      process.env.KEYCLOAK_ALLOWED_AUDIENCES ??
      process.env.KEYCLOAK_AUDIENCE ??
      'account,healthtech-platform,healthtech-backend';
    return new Set(
      configured
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    );
  }

  private getAllowedAzp(): Set<string> {
    const configured =
      process.env.KEYCLOAK_ALLOWED_AZP ??
      process.env.KEYCLOAK_CLIENT_ID ??
      'healthtech-platform,healthtech-backend';
    return new Set(
      configured
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    );
  }

  private getJwksUrl(): string {
    return (
      process.env.KEYCLOAK_JWKS_URL ||
      'http://keycloak:8080/realms/healthtech-realm/protocol/openid-connect/certs'
    );
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

    const alg = (header.alg ?? '').toUpperCase();
    const allowedAlgs = this.getAllowedAlgs();
    if (!allowedAlgs.has(alg) || !(alg in ALG_TO_NODE_VERIFY)) {
      throw new UnauthorizedException(`Unsupported JWT algorithm: ${header.alg ?? 'none'}`);
    }

    const clockSkewMs =
      (Number(process.env.JWT_CLOCK_SKEW_SECONDS) || DEFAULT_CLOCK_SKEW_SECONDS) * 1000;
    const now = Date.now();

    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      throw new UnauthorizedException('JWT missing required expiration (exp)');
    }
    if (payload.exp * 1000 < now - clockSkewMs) {
      throw new UnauthorizedException('Expired JWT token');
    }

    if (payload.nbf !== undefined) {
      if (typeof payload.nbf !== 'number' || !Number.isFinite(payload.nbf)) {
        throw new UnauthorizedException('Malformed JWT not-before (nbf)');
      }
      if (payload.nbf * 1000 > now + clockSkewMs) {
        throw new UnauthorizedException('JWT token not yet valid (nbf)');
      }
    }

    const allowedIssuers = this.getAllowedIssuers();
    const tokenIssuer = typeof payload.iss === 'string' ? payload.iss.replace(/\/+$/, '') : '';
    if (!tokenIssuer || !allowedIssuers.has(tokenIssuer)) {
      throw new UnauthorizedException('Invalid JWT issuer (iss)');
    }

    const allowedAudiences = this.getAllowedAudiences();
    const tokenAudiences = Array.isArray(payload.aud)
      ? payload.aud
      : typeof payload.aud === 'string'
        ? [payload.aud]
        : [];
    const hasValidAud = tokenAudiences.some((a) => allowedAudiences.has(a));
    if (!hasValidAud) {
      throw new UnauthorizedException('Invalid JWT audience (aud)');
    }

    if (payload.azp !== undefined) {
      const allowedAzp = this.getAllowedAzp();
      if (typeof payload.azp !== 'string' || !allowedAzp.has(payload.azp)) {
        throw new UnauthorizedException('Invalid JWT authorized party (azp)');
      }
    }

    const key = await this.getSigningKey(header.kid);
    const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8');
    const signature = Buffer.from(encodedSignature, 'base64url');

    const valid = verify(ALG_TO_NODE_VERIFY[alg], signingInput, key, signature);
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

    if (!cachedKeys.has(kid) && now - lastForcedRefreshAt < JWKS_FORCE_REFRESH_COOLDOWN_MS && cachedKeys.size > 0) {
      throw new UnauthorizedException(`JWKS public key not found for kid=${kid}`);
    }

    lastForcedRefreshAt = now;
    await this.refreshJwks();

    const key = cachedKeys.get(kid);
    if (!key) {
      throw new UnauthorizedException(`JWKS public key not found for kid=${kid}`);
    }
    return key;
  }

  private async refreshJwks(): Promise<void> {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    const jwksUrl = this.getJwksUrl();
    refreshInFlight = (async () => {
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

        if (nextMap.size === 0) {
          throw new Error('JWKS response contained no valid RSA keys');
        }

        cachedKeys = nextMap;
        cachedAt = Date.now();
      } catch (err: any) {
        this.logger.warn(`Failed to fetch JWKS from ${jwksUrl}: ${err?.message ?? err}`);
        const cacheExpiredBeyondGrace = Date.now() - cachedAt > JWKS_MAX_STALE_MS;
        if (cachedKeys.size === 0 || cacheExpiredBeyondGrace) {
          cachedKeys = new Map();
          throw new UnauthorizedException('Keycloak identity service unavailable to validate JWT');
        }
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  }
}
