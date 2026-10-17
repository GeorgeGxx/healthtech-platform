import {
  Injectable,
  Inject,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service.js';

@Injectable()
export class PhiAuditInterceptor implements NestInterceptor {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const path = req.path || req.url;
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers?.['user-agent'] || 'HealthTech-Client';
    const user = req.user || {
      id: req.headers?.['x-user-id'] || 'system-user',
      name: req.headers?.['x-user-name'] || 'Personal Clínico',
      role: req.headers?.['x-user-role'] || 'doctor_user',
    };

    let accion = 'CONSULTA_PHI';
    if (method === 'POST') accion = 'CREACION_PHI';
    if (method === 'PUT' || method === 'PATCH') accion = 'MODIFICACION_PHI';
    if (method === 'DELETE') accion = 'ELIMINACION_PHI';

    return next.handle().pipe(
      tap((data) => {
        // Registrar en auditoría de forma no bloqueante
        this.auditService
          .registrarAcceso({
            usuarioId: user.id,
            nombreUsuario: user.name,
            rol: user.role,
            accion,
            entidad: path.split('/')[2] || 'clinica',
            idEntidad: req.params?.id || (data && (data.id || data.idPaciente || data.idHistoria)),
            ipCliente: ip,
            userAgent,
            metadatos: {
              method,
              endpoint: path,
              statusCode: context.switchToHttp().getResponse()?.statusCode,
            },
          })
          .catch((err) => {
            // No fallar la petición del usuario si falla el audit log secundario
            console.error('Error no fatal registrando auditoría HIPAA:', err);
          });
      }),
    );
  }
}
