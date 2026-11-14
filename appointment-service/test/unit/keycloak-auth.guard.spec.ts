import 'reflect-metadata';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { generateKeyPairSync, sign } from 'node:crypto';
import { KeycloakAuthGuard, resetJwksCacheForTests } from '../../src/auth/keycloak-auth.guard.js';

describe('KeycloakAuthGuard', () => {
  let privateKeyPem: string;
  let jwkPublic: Record<string, string>;
  const origEnv = { ...process.env };

  beforeAll(() => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const jwk = publicKey.export({ format: 'jwk' }) as Record<string, string>;
    jwkPublic = { kid: 'test-kid-1', kty: 'RSA', alg: 'RS256', use: 'sig', n: jwk.n, e: jwk.e };
  });

  beforeEach(() => {
    resetJwksCacheForTests();
    process.env = {
      ...origEnv,
      NODE_ENV: 'production',
      DEV_AUTH_ENABLED: 'false',
      KEYCLOAK_JWKS_URL: 'https://auth.example.com/realms/healthtech-realm/protocol/openid-connect/certs',
      KEYCLOAK_ALLOWED_ISSUERS: 'https://auth.example.com/realms/healthtech-realm',
      KEYCLOAK_ALLOWED_AUDIENCES: 'healthtech-platform,account',
      KEYCLOAK_ALLOWED_AZP: 'healthtech-platform',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ keys: [jwkPublic] }),
      }),
    );
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.unstubAllGlobals();
  });

  function signJwt(payload: Record<string, unknown>, headerOverrides: Record<string, unknown> = {}): string {
    const header = { alg: 'RS256', typ: 'JWT', kid: 'test-kid-1', ...headerOverrides };
    const h = Buffer.from(JSON.stringify(header)).toString('base64url');
    const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = sign('RSA-SHA256', Buffer.from(`${h}.${p}`), privateKeyPem).toString('base64url');
    return `${h}.${p}.${sig}`;
  }

  function createContext(req: any, roles?: string[], isPublic = false) {
    const reflector = {
      getAllAndOverride: vi.fn((key: string) => {
        if (key === 'isPublic') return isPublic;
        if (key === 'roles') return roles;
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new KeycloakAuthGuard(reflector);
    const ctx: any = {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    };
    return { guard, ctx };
  }

  const validPayload = () => ({
    sub: 'user-123',
    preferred_username: 'dr.smith',
    iss: 'https://auth.example.com/realms/healthtech-realm',
    aud: 'healthtech-platform',
    azp: 'healthtech-platform',
    exp: Math.floor(Date.now() / 1000) + 300,
    nbf: Math.floor(Date.now() / 1000) - 10,
    realm_access: { roles: ['doctor_user'] },
  });

  it('allows valid RS256 token with matching iss, aud, exp, nbf, and required role', async () => {
    const token = signJwt(validPayload());
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const { guard, ctx } = createContext(req, ['doctor_user']);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user.sub).toBe('user-123');
    expect(req.user.roles).toContain('doctor_user');
  });

  it('rejects invalid JWT signature with 401', async () => {
    const token = signJwt(validPayload());
    const [h, p] = token.split('.');
    const tampered = `${h}.${p}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const { guard, ctx } = createContext({ headers: { authorization: `Bearer ${tampered}` } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects expired JWT with 401', async () => {
    const token = signJwt({ ...validPayload(), exp: Math.floor(Date.now() / 1000) - 120 });
    const { guard, ctx } = createContext({ headers: { authorization: `Bearer ${token}` } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects JWT missing exp claim with 401', async () => {
    const payload = validPayload();
    delete (payload as any).exp;
    const token = signJwt(payload);
    const { guard, ctx } = createContext({ headers: { authorization: `Bearer ${token}` } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects JWT with future nbf claim with 401', async () => {
    const token = signJwt({ ...validPayload(), nbf: Math.floor(Date.now() / 1000) + 300 });
    const { guard, ctx } = createContext({ headers: { authorization: `Bearer ${token}` } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects JWT with wrong issuer with 401', async () => {
    const token = signJwt({ ...validPayload(), iss: 'https://evil.example.com/realms/fake' });
    const { guard, ctx } = createContext({ headers: { authorization: `Bearer ${token}` } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects JWT with wrong audience with 401', async () => {
    const token = signJwt({ ...validPayload(), aud: 'other-service' });
    const { guard, ctx } = createContext({ headers: { authorization: `Bearer ${token}` } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects query-string access tokens with 401', async () => {
    const token = signJwt(validPayload());
    const { guard, ctx } = createContext({ headers: {}, query: { token } });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('ignores client-controlled x-user-* headers in production and rejects with 401', async () => {
    const { guard, ctx } = createContext({
      headers: { 'x-user-roles': 'admin_user', 'x-user-id': 'spoofed' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('never enables dev auth in production even if DEV_AUTH_ENABLED=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEV_AUTH_ENABLED = 'true';
    const { guard, ctx } = createContext({
      headers: { 'x-user-roles': 'admin_user' },
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects unauthorized role with 403 ForbiddenException', async () => {
    const token = signJwt({ ...validPayload(), realm_access: { roles: ['basic_user'] } });
    const { guard, ctx } = createContext(
      { headers: { authorization: `Bearer ${token}` } },
      ['admin_user'],
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
