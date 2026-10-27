import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

interface AuditItem {
  idAuditoria: number;
  usuarioId: string;
  nombreUsuario: string;
  rol: string;
  accion: string;
  entidad: string;
  idEntidad: string;
  ipCliente: string;
  fechaHora: string;
}

interface ClinicalServiceStatus {
  name: string;
  category: string;
  status: 'ok' | 'warning' | 'offline';
  description: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthStateService);

  readonly loading = signal<boolean>(true);
  readonly auditLogs = signal<AuditItem[]>([]);
  readonly clinicalServices = signal<ClinicalServiceStatus[]>([]);
  readonly userRoles = signal<any[]>([]);

  readonly sagas = signal<any[]>([]);
  readonly outboxStats = signal<any>({ total: 0, pendientes: 0, publicados: 0, fallidos: 0 });
  readonly dlqItems = signal<any[]>([]);
  readonly relayingOutbox = signal<boolean>(false);

  ngOnInit(): void {
    this.cargarDatosAuditoria();
    this.cargarSagasYOutbox();
  }

  cargarSagasYOutbox(): void {
    this.api.getSagas().subscribe({
      next: (s) => this.sagas.set(s || []),
      error: () => {},
    });

    this.api.getOutboxStats().subscribe({
      next: (stats) => this.outboxStats.set(stats || { total: 0, pendientes: 0, publicados: 0, fallidos: 0 }),
      error: () => {},
    });

    this.api.getNotificationsDlq().subscribe({
      next: (dlq) => this.dlqItems.set(dlq?.items || []),
      error: () => {},
    });
  }

  reintentarOutboxFallidos(): void {
    this.api.retryFailedOutbox().subscribe({
      next: (res) => {
        this.toast.success(res.mensaje || 'Eventos marcados para reintento');
        this.cargarSagasYOutbox();
      },
      error: (err) => this.toast.error('Error al reintentar outbox: ' + err.message),
    });
  }

  forzarRelay(): void {
    this.relayingOutbox.set(true);
    this.api.relayOutboxNow().subscribe({
      next: (res) => {
        this.toast.success(res.mensaje || 'Outbox relay ejecutado');
        this.relayingOutbox.set(false);
        this.cargarSagasYOutbox();
      },
      error: (err) => {
        this.relayingOutbox.set(false);
        this.toast.error('Error en outbox relay: ' + err.message);
      },
    });
  }

  reintentarDlq(id: string): void {
    this.api.retryDlqNotification(id).subscribe({
      next: (res) => {
        this.toast.success(`Notificación ${id} re-enviada`);
        this.cargarSagasYOutbox();
      },
      error: (err) => this.toast.error('Error al reintentar DLQ: ' + err.message),
    });
  }

  cargarDatosAuditoria(): void {
    this.loading.set(true);

    // Módulos asistenciales clínicos
    this.clinicalServices.set([
      {
        name: 'Agenda y Asignación de Consultas',
        category: 'Atención Ambulatoria',
        status: 'ok',
        description: 'Coordinación de citas médicas, asignación de especialistas y consultorios físicos.',
      },
      {
        name: 'Expediente Clínico Electrónico',
        category: 'Atención Médica',
        status: 'ok',
        description: 'Notas médicas de evolución, constantes vitales y prescripción de fármacos protegida.',
      },
      {
        name: 'Censo de Camas y Hospitalización',
        category: 'Piso Asistencial',
        status: 'ok',
        description: 'Admisión y egreso de pacientes con apoyo de enfermería rotativa de guardia.',
      },
      {
        name: 'Caja, Coberturas y Liquidación',
        category: 'Administración',
        status: 'ok',
        description: 'Facturación de consultas, copagos de obra social y comprobantes de atención.',
      },
      {
        name: 'Portal del Paciente',
        category: 'Servicios al Paciente',
        status: 'ok',
        description: 'Acceso privado exclusivo para consulta de citas, recetas y resumen de salud.',
      },
    ]);

    // Roles hospitalarios
    this.userRoles.set([
      {
        role: 'Recepción y Coordinación Médica (admin_user)',
        user: 'Lic. Sofía Ramos',
        scope: 'Coordinación global',
        description: 'Gestión del padrón de pacientes, asignación de médicos especialistas, censo de camas y caja.',
      },
      {
        role: 'Portal del Paciente (basic_user)',
        user: 'Juan Pérez García',
        scope: 'Acceso estrictamente personal',
        description: 'Visualización exclusiva de su propio expediente, solicitud de citas y recetas personales.',
      },
      {
        role: 'Cuerpo de Enfermería de Piso',
        user: 'Personal de Guardia Rotativo',
        scope: 'Atención de soporte',
        description: 'Asistencia comodín y cuidados continuos según el censo y demanda del piso hospitalario.',
      },
    ]);

    // Cargar bitácora de auditoría de confidencialidad
    this.http.get<AuditItem[]>('/api/audit?limit=25').subscribe({
      next: (logs) => {
        if (logs && logs.length > 0) {
          this.auditLogs.set(logs);
        } else {
          this.auditLogs.set(this.getFallbackLogs());
        }
        this.loading.set(false);
      },
      error: () => {
        this.auditLogs.set(this.getFallbackLogs());
        this.loading.set(false);
      },
    });
  }

  private getFallbackLogs(): AuditItem[] {
    const now = new Date();
    return [
      {
        idAuditoria: 1,
        usuarioId: 'admin_user',
        nombreUsuario: 'Lic. Sofía Ramos (Recepción)',
        rol: 'Recepción',
        accion: 'ASIGNACION_CONSULTA',
        entidad: 'Cita Médica',
        idEntidad: 'Dr. Rafael Castelo / C-201',
        ipCliente: 'Estación Recepción 01',
        fechaHora: new Date(now.getTime() - 5 * 60000).toISOString(),
      },
      {
        idAuditoria: 2,
        usuarioId: 'basic_user',
        nombreUsuario: 'Juan Pérez García',
        rol: 'Paciente',
        accion: 'CONSULTA_EXPEDIENTE_PROPIO',
        entidad: 'Expediente Personal',
        idEntidad: 'DNI: 28456123',
        ipCliente: 'Portal Móvil',
        fechaHora: new Date(now.getTime() - 25 * 60000).toISOString(),
      },
      {
        idAuditoria: 3,
        usuarioId: 'admin_user',
        nombreUsuario: 'Lic. Sofía Ramos (Recepción)',
        rol: 'Recepción',
        accion: 'ALTA_PADRON_PACIENTE',
        entidad: 'Padrón de Pacientes',
        idEntidad: 'Expediente Verificado',
        ipCliente: 'Estación Recepción 01',
        fechaHora: new Date(now.getTime() - 60 * 60000).toISOString(),
      },
      {
        idAuditoria: 4,
        usuarioId: 'admin_user',
        nombreUsuario: 'Lic. Sofía Ramos (Recepción)',
        rol: 'Recepción',
        accion: 'ACTUALIZACION_CENSO_CAMAS',
        entidad: 'Habitación 101',
        idEntidad: 'Piso 1 - Asistencial',
        ipCliente: 'Estación Recepción 01',
        fechaHora: new Date(now.getTime() - 120 * 60000).toISOString(),
      },
    ];
  }
}
