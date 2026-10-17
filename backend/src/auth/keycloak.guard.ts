import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { UserContext } from './current-user.decorator.js';

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // 1. Si viene Bearer token (JWT de Keycloak)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded) {
          const roles: string[] = [
            ...(decoded.realm_access?.roles || []),
            ...(decoded.resource_access?.['healthtech-platform']?.roles || []),
          ];

          request.user = {
            id: decoded.sub || decoded.preferred_username || 'anonymous',
            username: decoded.preferred_username || decoded.sub || 'user',
            email: decoded.email,
            name: decoded.name || decoded.preferred_username,
            roles: roles.length > 0 ? roles : ['basic_user'],
          } as UserContext;

          return true;
        }
      } catch (err) {
        throw new UnauthorizedException('Token de autenticación Keycloak inválido');
      }
    }

    const devAuthEnabled = process.env.DEV_AUTH_ENABLED === 'true';
    if (!devAuthEnabled) {
      throw new UnauthorizedException('Bearer token de Keycloak requerido');
    }

    // Desarrollo local únicamente. Desactívelo en entornos compartidos o productivos.
    const devRolesHeader = request.headers['x-user-roles'];
    const devUserHeader = request.headers['x-user-id'];
    const devNameHeader = request.headers['x-user-name'];

    const roles = devRolesHeader
      ? String(devRolesHeader).split(',').map((r) => r.trim())
      : ['basic_user'];

    request.user = {
      id: (devUserHeader as string) || 'dr-medico-01',
      username: (devNameHeader as string) || 'admin_clinico',
      name: (devNameHeader as string) || 'Dr. Fernando González Valdés',
      roles,
    } as UserContext;

    return true;
  }
}
