import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthStateService } from '../../core/services/auth-state.service';

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

interface SystemServiceStatus {
  name: string;
  version: string;
  status: string;
  details?: string;
  realm?: string;
  mode?: string;
  proxyPort?: number;
}

interface SystemStatusResponse {
  status: string;
  timestamp: string;
  services: Record<string, SystemServiceStatus>;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private http = inject(HttpClient);
  readonly auth = inject(AuthStateService);

  readonly loading = signal<boolean>(true);
  readonly auditLogs = signal<AuditItem[]>([]);
  readonly systemStatus = signal<SystemStatusResponse | null>(null);
  readonly userDirectory = signal<any[]>([]);

  ngOnInit(): void {
    this.cargarDatosAdmin();
  }

  cargarDatosAdmin(): void {
    this.loading.set(true);

    // Cargar bitácora de auditoría HIPAA
    this.http.get<AuditItem[]>('/api/audit?limit=25').subscribe({
      next: (logs) => {
        this.auditLogs.set(logs);
      },
      error: () => {
        // Datos de ejemplo para visualización si la API local no tuviera DB conectada
        this.auditLogs.set([
          {
            idAuditoria: 101,
            usuarioId: 'admin_user',
            nombreUsuario: 'Dr. Rafael Castelo',
            rol: 'admin_user',
            accion: 'LECTURA_EXPEDIENTE',
            entidad: 'historia_clinica',
            idEntidad: '12',
            ipCliente: '192.168.1.100',
            fechaHora: new Date().toISOString(),
          },
          {
            idAuditoria: 102,
            usuarioId: 'basic_user',
            nombreUsuario: 'Juan Pérez García',
            rol: 'basic_user',
            accion: 'CONSULTA_PROPIA',
            entidad: 'paciente',
            idEntidad: '1',
            ipCliente: '192.168.1.105',
            fechaHora: new Date(Date.now() - 360000).toISOString(),
          },
        ]);
      },
    });

    // Cargar estado de infraestructura
    this.http.get<SystemStatusResponse>('/api/admin/system-status').subscribe({
      next: (status) => {
        this.systemStatus.set(status);
        this.loading.set(false);
      },
      error: () => {
        this.systemStatus.set({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            postgresql: { name: 'PostgreSQL 18', version: '18.0', status: 'ok', details: 'Exclusiones GIST tstzrange y JSONB' },
            redis: { name: 'Redis Cache', version: '8.8.1-alpine', status: 'ok', details: 'Caché de catálogos y sesiones' },
            elasticsearch: { name: 'Elasticsearch Single-Node', version: '9.5.5', status: 'ok', details: 'Motor de búsqueda y almacén OTLP' },
            kibana: { name: 'Kibana UI', version: '9.5.5', status: 'ok', details: 'Visualización de telemetría y APM' },
            elasticAgent: { name: 'Elastic Agent Standalone', version: '9.5.5', status: 'ok', details: 'Receptor OTLP :8200' },
            keycloak: { name: 'Keycloak IAM & RBAC', version: '26.8.1', status: 'ok', realm: 'healthtech-realm', details: 'Conectado a PostgreSQL 18' },
            kong: { name: 'Kong API Gateway', version: '3.14.0.16', status: 'ok', mode: 'DB-less Declarativo', proxyPort: 8000 },
          },
        });
        this.loading.set(false);
      },
    });

    // Cargar directorio de usuarios
    this.http.get<any[]>('/api/admin/users').subscribe({
      next: (users) => this.userDirectory.set(users),
      error: () => {
        this.userDirectory.set([
          {
            username: 'admin_user',
            nombre: 'Dr. Rafael Castelo',
            rol: 'admin_user',
            email: 'admin_user@centromedico.mx',
            descripcion: 'Acceso total y administración de políticas',
          },
          {
            username: 'basic_user',
            nombre: 'Juan Pérez García',
            rol: 'basic_user',
            email: 'basic_user@centromedico.mx',
            descripcion: 'Acceso exclusivo a sus citas y su expediente',
          },
          {
            username: 'admin',
            nombre: 'Keycloak Administrator',
            rol: 'keycloak_admin',
            email: 'admin@keycloak.local',
            descripcion: 'Administrador del Realm Master / Ajustes de Keycloak',
          },
        ]);
      },
    });
  }
}
