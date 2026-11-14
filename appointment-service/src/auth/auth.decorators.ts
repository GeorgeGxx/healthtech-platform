import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

export interface AuthenticatedUser {
  sub: string;
  username: string;
  email?: string;
  roles: string[];
  azp?: string;
  patientId?: number;
  doctorId?: number;
}

/**
 * Marks an endpoint as public (bypasses JWT/Keycloak validation).
 * Use exclusively for health probes, public catalogs, and non-PHI verification.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Restricts endpoint access to users who have at least one of the specified roles.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Injects the validated authenticated user principal from the HTTP request.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const req = ctx.switchToHttp().getRequest();
    return req?.user as AuthenticatedUser | undefined;
  },
);
