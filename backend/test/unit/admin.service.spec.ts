import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '../../src/modules/admin/admin.service.js';

describe('AdminService (Hospital Governance & Microservices Health)', () => {
  let adminService: AdminService;
  let mockDataSource: any;

  beforeEach(() => {
    mockDataSource = {
      query: vi.fn((sql: string) => {
        if (sql.includes('version()')) {
          return Promise.resolve([{ version: 'PostgreSQL 18.0 (Ubuntu)' }]);
        }
        if (sql.includes('paciente')) {
          return Promise.resolve([{ total: 10 }]);
        }
        if (sql.includes('turno')) {
          return Promise.resolve([{ total: 25 }]);
        }
        if (sql.includes('registro_auditoria')) {
          return Promise.resolve([{ total: 42 }]);
        }
        if (sql.includes('pago')) {
          return Promise.resolve([{ total: 8500.50 }]);
        }
        if (sql.includes('internacion')) {
          return Promise.resolve([{ total: 3 }]);
        }
        return Promise.resolve([]);
      }),
    };

    adminService = new AdminService(mockDataSource);
  });

  it('debe devolver el estado consolidado de la infraestructura incluyendo Keycloak 26.8.1, Redis 8.8.1 y Kong 3.14.0.16', async () => {
    const status = await adminService.getSystemStatus();

    expect(status.status).toBe('healthy');
    expect(status.services.postgresql.version).toBe('18.0');
    expect(status.services.redis.version).toBe('8.8.1-alpine');
    expect(status.services.keycloak.version).toBe('26.8.1');
    expect(status.services.keycloak.realm).toBe('healthtech-realm');
    expect(status.services.kong.version).toBe('3.14.0.16');
    expect(status.services.elasticsearch.version).toBe('9.5.5');
  });

  it('debe calcular métricas operativas consolidadas', async () => {
    const metrics = await adminService.getMetricsSummary();

    expect(metrics.totalPacientes).toBe(10);
    expect(metrics.totalTurnos).toBe(25);
    expect(metrics.accesosAuditoriaPhi).toBe(42);
    expect(metrics.recaudacionNetaMxn).toBe(8500.50);
    expect(metrics.pacientesInternados).toBe(3);
  });

  it('debe devolver el directorio de usuarios con admin_user, basic_user y admin de Keycloak', () => {
    const users = adminService.getUsersDirectory();

    expect(users).toHaveLength(3);
    const usernames = users.map((u) => u.username);
    expect(usernames).toContain('admin_user');
    expect(usernames).toContain('basic_user');
    expect(usernames).toContain('admin');
  });
});
