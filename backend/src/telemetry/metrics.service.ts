import { Injectable, OnModuleInit } from '@nestjs/common';
import { metrics, Counter, Histogram, Meter } from '@opentelemetry/api';

@Injectable()
export class MetricsService implements OnModuleInit {
  private meter: Meter;
  public appointmentsCounter!: Counter;
  public phiAccessCounter!: Counter;
  public billingCounter!: Counter;
  public hospitalizationsCounter!: Counter;
  public requestDurationHistogram!: Histogram;

  onModuleInit() {
    this.meter = metrics.getMeter('healthtech-platform-metrics', '1.0.0');

    this.appointmentsCounter = this.meter.createCounter('healthtech_appointments_total', {
      description: 'Número total de turnos o citas médicas gestionadas en el Centro Médico',
      unit: '1',
    });

    this.phiAccessCounter = this.meter.createCounter('healthtech_phi_access_total', {
      description: 'Total de accesos a Expedientes Clínicos y Datos PHI (Cumplimiento HIPAA / NOM-024)',
      unit: '1',
    });

    this.billingCounter = this.meter.createCounter('healthtech_billing_amount_total', {
      description: 'Monto total facturado y coaseguros procesados (MXN)',
      unit: 'MXN',
    });

    this.hospitalizationsCounter = this.meter.createCounter('healthtech_hospitalizations_total', {
      description: 'Ingresos y egresos hospitalarios registrados en el censo de camas',
      unit: '1',
    });

    this.requestDurationHistogram = this.meter.createHistogram('healthtech_request_duration_ms', {
      description: 'Latencia y tiempo de respuesta de operaciones clínicas críticas',
      unit: 'ms',
    });
  }

  recordAppointment(status: string, especialidadId?: number) {
    this.appointmentsCounter?.add(1, {
      status,
      especialidad_id: especialidadId?.toString() || 'unknown',
    });
  }

  recordPhiAccess(entity: string, action: string, role: string) {
    this.phiAccessCounter?.add(1, {
      entity,
      action,
      role,
    });
  }

  recordBilling(amount: number, insurer: string) {
    this.billingCounter?.add(amount, {
      insurer,
    });
  }

  recordHospitalization(action: 'ingreso' | 'alta', roomType?: string) {
    this.hospitalizationsCounter?.add(1, {
      action,
      room_type: roomType || 'general',
    });
  }
}
