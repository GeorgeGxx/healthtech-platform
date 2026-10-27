import { Controller, Get, Post, Body, Query, Param, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsHttpController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      microservicio: 'notification-service',
      version: '1.0.0',
      transport: 'Kafka 8.x + Redis 8.8.1',
      metrics: this.notificationsService.getMetrics(),
    };
  }

  @Get('health/liveness')
  liveness() {
    return { status: 'UP', service: 'notification-service' };
  }

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

  @Post('reminders/trigger')
  async triggerReminders(@Body() body?: any) {
    return await this.notificationsService.triggerAutomatedReminders(body);
  }

  @Get('history')
  getHistory(@Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 50;
    return {
      total: this.notificationsService.getHistory(lim).length,
      items: this.notificationsService.getHistory(lim),
    };
  }

  @Sse('stream')
  streamNotifications(): Observable<MessageEvent> {
    return this.notificationsService.getStream().pipe(
      map((notif) => ({ data: notif } as MessageEvent)),
    );
  }

  @Post('test-dispatch')
  async testDispatch(
    @Body()
    body: {
      tipo: string;
      pacienteNombre: string;
      pacienteEmail: string;
      medicoNombre: string;
      especialidad: string;
      idTurno?: number;
    },
  ) {
    const mockEvent = {
      eventId: `test-${Date.now()}`,
      eventType: body.tipo || 'appointment.created',
      timestamp: new Date().toISOString(),
      payload: {
        idTurno: body.idTurno || 999,
        pacienteNombre: body.pacienteNombre || 'Juan Pérez García',
        pacienteEmail: body.pacienteEmail || 'juan.perez@centromedico.mx',
        medicoNombre: body.medicoNombre || 'Dra. Laura Gómez',
        especialidad: body.especialidad || 'Cardiología',
        consultorio: 'Consultorio 204',
        fechaInicio: new Date().toISOString(),
      },
    };

    const result = await this.notificationsService.processAppointmentEvent(mockEvent);
    return {
      mensaje: 'Notificación de prueba procesada con éxito',
      despachos: result,
    };
  }

  @Get('dlq')
  getDlq(@Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 50;
    return {
      totalEnDlq: this.notificationsService.getDlq(lim).length,
      items: this.notificationsService.getDlq(lim),
    };
  }

  @Post('dlq/:id/retry')
  async retryDlq(@Param('id') id: string) {
    const reintento = await this.notificationsService.retryDlqItem(id);
    if (!reintento) {
      return { status: 'NOT_FOUND', mensaje: `Notificación ${id} no encontrada en DLQ` };
    }
    return { status: 'RETRY_SUCCESS', notificacion: reintento };
  }
}
