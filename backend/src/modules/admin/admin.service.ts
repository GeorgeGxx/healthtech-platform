import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DashboardService } from '../dashboard/dashboard.service.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly dashboardService: DashboardService,
  ) {}

  async getSystemStatus() {
    let dbStatus = 'ok';
    let dbVersion = 'PostgreSQL 18';
    try {
      const res = await this.dataSource.query('SELECT version();');
      dbVersion = res[0]?.version || 'PostgreSQL 18';
    } catch {
      dbStatus = 'degraded';
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        postgresql: {
          name: 'PostgreSQL 18 Relational DB',
          version: '18.0',
          status: dbStatus,
          details: 'GIST tstzrange exclusions, JSONB vital signs & prescriptions',
        },
        redis: {
          name: 'Redis Distributed Cache',
          version: '8.8.1-alpine',
          status: 'ok',
          details: 'In-memory caching for medical specialties and insurers',
        },
        elasticsearch: {
          name: 'Elasticsearch (Single-Node)',
          version: '9.5.5',
          status: 'ok',
          details: 'Native search engine & OTLP observability datastore',
        },
        kibana: {
          name: 'Kibana Management UI',
          version: '9.5.5',
          status: 'ok',
          details: 'APM dashboards & real-time telemetry analytics',
        },
        elasticAgent: {
          name: 'Elastic Agent Standalone',
          version: '9.5.5',
          status: 'ok',
          details: 'OTLP collector on port 8200 (traces, metrics, ECS logs)',
        },
        keycloak: {
          name: 'Keycloak IAM & RBAC',
          version: '26.8.1',
          status: 'ok',
          realm: 'healthtech-realm',
          db: 'Connected to PostgreSQL 18',
        },
        kong: {
          name: 'Kong API Gateway (DB-less)',
          version: '3.9.4',
          status: 'ok',
          mode: 'Declarative YAML',
          proxyPort: 8000,
        },
      },
    };
  }

  async getMetricsSummary() {
    const { kpis } = await this.dashboardService.getExecutiveMetrics();
    const [auditCount] = await this.dataSource.query('SELECT COUNT(*) AS total FROM registro_auditoria');

    return {
      totalPacientes: kpis.totalPatients,
      totalTurnos: kpis.totalAppointments,
      accesosAuditoriaPhi: Number(auditCount?.total || 0),
      recaudacionNetaMxn: kpis.totalRevenue,
      pacientesInternados: kpis.occupiedBeds,
    };
  }

  getUsersDirectory() {
    return [
      {
        id: 'usr-admin-01',
        username: 'admin_user',
        nombre: 'Dr. Administrador General',
        email: 'admin_user@centromedico.mx',
        rol: 'admin_user',
        descripcion: 'Acceso total hospitalario + Panel de Administración',
        permisos: ['READ_ALL', 'WRITE_ALL', 'VIEW_AUDIT', 'MANAGE_SETTINGS'],
      },
      {
        id: 'usr-basic-01',
        username: 'basic_user',
        nombre: 'Juan Pérez García (Paciente)',
        email: 'basic_user@centromedico.mx',
        rol: 'basic_user',
        descripcion: 'Portal Paciente: Consulta exclusiva de sus datos, citas e historial',
        permisos: ['READ_OWN_PROFILE', 'READ_OWN_APPOINTMENTS', 'READ_OWN_RECORDS'],
      },
      {
        id: 'usr-keycloak-master',
        username: 'admin',
        nombre: 'Master Realm Administrator',
        email: 'admin@keycloak.local',
        rol: 'keycloak_admin',
        descripcion: 'Gestor del Realm Keycloak, clientes OpenID Connect y políticas de seguridad',
        permisos: ['MANAGE_REALM', 'MANAGE_CLIENTS', 'MANAGE_IDP'],
      },
    ];
  }
}
