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
        this.toast.success(res.mensaje || 'Events marked for retry');
        this.cargarSagasYOutbox();
      },
      error: (err) => this.toast.error('Error retrying outbox: ' + err.message),
    });
  }

  forzarRelay(): void {
    this.relayingOutbox.set(true);
    this.api.relayOutboxNow().subscribe({
      next: (res) => {
        this.toast.success(res.mensaje || 'Outbox relay executed');
        this.relayingOutbox.set(false);
        this.cargarSagasYOutbox();
      },
      error: (err) => {
        this.relayingOutbox.set(false);
        this.toast.error('Outbox relay error: ' + err.message);
      },
    });
  }

  reintentarDlq(id: string): void {
    this.api.retryDlqNotification(id).subscribe({
      next: (res) => {
        this.toast.success(`Notification ${id} re-sent`);
        this.cargarSagasYOutbox();
      },
      error: (err) => this.toast.error('Error retrying DLQ: ' + err.message),
    });
  }

  cargarDatosAuditoria(): void {
    this.loading.set(true);

    // Clinical care modules
    this.clinicalServices.set([
      {
        name: 'Scheduling & Consultation Assignment',
        category: 'Outpatient Care',
        status: 'ok',
        description: 'Coordination of medical appointments, specialist assignment, and physical examination rooms.',
      },
      {
        name: 'Electronic Health Record (EHR)',
        category: 'Medical Care',
        status: 'ok',
        description: 'Protected clinical progress notes, vital signs, and medication prescriptions.',
      },
      {
        name: 'Bed Census & Hospitalization',
        category: 'Care Floor',
        status: 'ok',
        description: 'Patient admission and discharge with rotating on-call nursing support.',
      },
      {
        name: 'Cashier, Coverage & Settlement',
        category: 'Administration',
        status: 'ok',
        description: 'Consultation billing, insurance copayments, and care receipts.',
      },
      {
        name: 'Patient Portal',
        category: 'Patient Services',
        status: 'ok',
        description: 'Exclusive private access to view appointments, prescriptions, and health summary.',
      },
    ]);

    // Hospital roles
    this.userRoles.set([
      {
        role: 'Reception & Medical Coordination (admin_user)',
        user: 'Sofia Ramos',
        scope: 'Global coordination',
        description: 'Patient registry management, specialist physician assignment, bed census, and cashier.',
      },
      {
        role: 'Patient Portal (basic_user)',
        user: 'Juan Perez Garcia',
        scope: 'Strictly personal access',
        description: 'Exclusive view of their own medical record, appointment requests, and personal prescriptions.',
      },
      {
        role: 'Floor Nursing Staff',
        user: 'Rotating On-Call Staff',
        scope: 'Support care',
        description: 'Float assistance and continuous care based on hospital floor census and demand.',
      },
    ]);

    // Load confidentiality audit log
    this.http.get<AuditItem[]>('/api/audit?limit=25').subscribe({
      next: (logs) => {
        this.auditLogs.set(logs ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.auditLogs.set([]);
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
        nombreUsuario: 'Sofia Ramos (Reception)',
        rol: 'Reception',
        accion: 'APPOINTMENT_ASSIGNMENT',
        entidad: 'Medical Appointment',
        idEntidad: 'Dr. Rafael Castelo / C-201',
        ipCliente: 'Reception Station 01',
        fechaHora: new Date(now.getTime() - 5 * 60000).toISOString(),
      },
      {
        idAuditoria: 2,
        usuarioId: 'basic_user',
        nombreUsuario: 'Juan Perez Garcia',
        rol: 'Patient',
        accion: 'SELF_RECORD_ACCESS',
        entidad: 'Personal Record',
        idEntidad: 'ID: 28456123',
        ipCliente: 'Mobile Portal',
        fechaHora: new Date(now.getTime() - 25 * 60000).toISOString(),
      },
      {
        idAuditoria: 3,
        usuarioId: 'admin_user',
        nombreUsuario: 'Sofia Ramos (Reception)',
        rol: 'Reception',
        accion: 'PATIENT_REGISTRY_CREATE',
        entidad: 'Patient Registry',
        idEntidad: 'Verified Record',
        ipCliente: 'Reception Station 01',
        fechaHora: new Date(now.getTime() - 60 * 60000).toISOString(),
      },
      {
        idAuditoria: 4,
        usuarioId: 'admin_user',
        nombreUsuario: 'Sofia Ramos (Reception)',
        rol: 'Reception',
        accion: 'BED_CENSUS_UPDATE',
        entidad: 'Room 101',
        idEntidad: 'Floor 1 - Care Unit',
        ipCliente: 'Reception Station 01',
        fechaHora: new Date(now.getTime() - 120 * 60000).toISOString(),
      },
    ];
  }
}
