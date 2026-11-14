import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/**
 * Marks an endpoint as public (bypasses JWT/Keycloak validation).
 * Use exclusively for health probes, public catalogs, and public verification.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Restricts endpoint access to users who have at least one of the specified roles.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
