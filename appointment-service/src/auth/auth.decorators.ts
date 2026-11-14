import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/**
 * Marca un endpoint como público (omite validación JWT/Keycloak).
 * Usar exclusivamente para health probes, catálogos públicos y verificación pública.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Restringe el acceso al endpoint a usuarios que posean al menos uno de los roles indicados.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
