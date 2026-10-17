import {
  Injectable,
  Inject,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';
import { UserContext } from './current-user.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No requiere rol específico
    }

    const { user } = context.switchToHttp().getRequest() as { user: UserContext };
    if (!user || !user.roles) {
      throw new ForbiddenException('Acceso denegado: El usuario no cuenta con roles asignados');
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso restringido por política hospitalaria. Roles requeridos: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
