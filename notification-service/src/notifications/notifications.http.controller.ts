import { Controller, Get, Post, Body, Query, Param, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NotificationsService } from './notifications.service.js';
import { TriggerReminderDto, TestDispatchDto } from './dto/notification.dto.js';
import { Public, Roles, CurrentUser, type AuthenticatedUser } from '../auth/auth.decorators.js';

@Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user', 'basic_user')
@Controller('notifications')
export class NotificationsHttpController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Public()
  @Get('health')
  async getHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      microservicio: 'notification-service',
      version: '1.0.0',
      transport: 'Kafka 8.x + Redis 8.8.1 + PostgreSQL 18 (DLQ)',
      metrics: await this.notificationsService.getMetrics(),
    };
  }

  @Public()
  @Get('health/liveness')
  liveness() {
    return { status: 'UP', service: 'notification-service' };
  }

  @Public()
  @Get('health/readiness')
  readiness() {
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      checks: {
        service: 'UP',
        redis: 'CONNECTED',
      },
    };
  }

  @Roles('admin_user')
  @Post('reminders/trigger')
  async triggerReminders(@Body() body?: TriggerReminderDto) {
    return await this.notificationsService.triggerAutomatedReminders(body);
  }

  @Get('history')
  getHistory(
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const lim = limit ? parseInt(limit, 10) : 50;
    const items = this.notificationsService.getHistory(lim, user);
    return {
      total: items.length,
      items,
    };
  }

  @Sse('stream')
  streamNotifications(@CurrentUser() user?: AuthenticatedUser): Observable<MessageEvent> {
    return this.notificationsService.getStream(user).pipe(
      map((notif) => ({ data: notif } as MessageEvent)),
    );
  }

  @Roles('admin_user')
  @Post('test-dispatch')
  async testDispatch(@Body() body: TestDispatchDto) {
    const mockEvent = {
      eventId: `test-${Date.now()}`,
      eventType: body.tipo || 'appointment.created',
      timestamp: new Date().toISOString(),
      payload: {
        idTurno: body.idTurno || 999,
        pacienteNombre: body.pacienteNombre || 'Juan Pérez García',
        pacienteEmail: body.destinatario || 'juan.perez@centromedico.mx',
        medicoNombre: body.medicoNombre || 'Dra. Laura Gómez',
        especialidad: body.especialidad || 'Cardiology',
        consultorio: body.consultorio || 'Office 204',
        fechaInicio: body.fechaHora || new Date().toISOString(),
      },
    };

    const result = await this.notificationsService.processAppointmentEvent(mockEvent);
    return {
      mensaje: 'Test notification processed successfully',
      despachos: result,
    };
  }

  @Roles('admin_user')
  @Get('dlq')
  async getDlq(@Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 50;
    const items = await this.notificationsService.getDlq(lim);
    return {
      totalEnDlq: items.length,
      items,
    };
  }

  @Roles('admin_user')
  @Post('dlq/:id/retry')
  async retryDlq(@Param('id') id: string) {
    const reintento = await this.notificationsService.retryDlqItem(id);
    if (!reintento) {
      return { status: 'NOT_FOUND', mensaje: `Notification ${id} not found in DLQ` };
    }
    return { status: 'RETRY_SUCCESS', notificacion: reintento };
  }
}
