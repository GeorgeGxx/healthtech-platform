import { describe, it, expect, vi } from 'vitest';
import { RolesGuard } from '../../src/auth/roles.guard.js';
import { ForbiddenException } from '@nestjs/common';

describe('RolesGuard (Keycloak RBAC)', () => {
  let guard: RolesGuard;
  let mockReflector: any;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new RolesGuard(mockReflector);
  });

  it('debe permitir acceso si el endpoint no tiene roles requeridos', () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles: ['basic_user'] } }),
      }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('debe permitir acceso si el usuario cuenta con el rol requerido (ej. admin_user)', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin_user']);
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles: ['admin_user', 'doctor_user'] } }),
      }),
    };

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('debe lanzar ForbiddenException si el usuario no tiene el rol requerido', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin_user']);
    const mockContext: any = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles: ['patient_user'] } }),
      }),
    };

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
