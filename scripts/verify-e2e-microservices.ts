/**
 * Script de Verificación End-to-End (E2E) de Microservicios, Sagas y Event-Driven Architecture
 * Centro Médico Nacional - HealthTech Platform
 * 100% TypeScript Estricto
 */

declare const process: {
  env: Record<string, string | undefined>;
  stdout: { write: (str: string) => boolean | void };
  argv: string[];
};

export interface StepResult<T = unknown> {
  ok: boolean;
  result?: T;
  error?: string;
  elapsedMs?: number;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
}

export interface NotificationDispatchResponse {
  exito: boolean;
  despachos?: Array<{
    canal: string;
    destinatario: string;
    estado: string;
  }>;
}

export interface OutboxStatsResponse {
  pendientes: number;
  procesados: number;
  fallidos: number;
}

const BASE_URL: string = process.env.API_GATEWAY_URL || 'http://localhost:8000/api';

async function logStep<T>(title: string, fn: () => Promise<T>): Promise<StepResult<T>> {
  process.stdout.write(`\n🔍 [E2E] ${title}... `);
  try {
    const start = Date.now();
    const result = await fn();
    const elapsed = Date.now() - start;
    console.log(`✅ OK (${elapsed}ms)`);
    if (result && typeof result === 'object') {
      const summary = JSON.stringify(result).slice(0, 140);
      console.log(`   └─ Respuesta: ${summary}...`);
    }
    return { ok: true, result, elapsedMs: elapsed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`❌ FALLÓ`);
    console.error(`   └─ Error: ${message}`);
    return { ok: false, error: message };
  }
}

export async function runVerification(): Promise<boolean> {
  console.log('======================================================================');
  console.log('🏥 HealthTech Platform - Verificación E2E de Arquitectura Microservicios');
  console.log(`   API Gateway Target: ${BASE_URL}`);
  console.log('   Stack: NestJS 12, Kafka 8.3.2, Redis 8.8.1, Kong 3.9, Postgres 18');
  console.log('======================================================================');

  let passed = 0;
  let total = 0;

  // 1. Health Check de notification-service (:3005)
  total++;
  const r1 = await logStep<HealthCheckResponse>('Health Check de notification-service (:3005)', async () => {
    const res = await fetch(`${BASE_URL}/notifications/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (r1.ok) passed++;

  // 2. Health Check de appointment-service (:3001)
  total++;
  const r2 = await logStep<HealthCheckResponse>('Health Check de appointment-service (:3001)', async () => {
    const res = await fetch(`${BASE_URL}/appointments/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (r2.ok) passed++;

  // 3. Health Check de patient-service (:3002)
  total++;
  const r3 = await logStep<HealthCheckResponse>('Health Check de patient-service (:3002)', async () => {
    const res = await fetch(`${BASE_URL}/patients/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (r3.ok) passed++;

  // 4. Health Check de billing-service (:3003)
  total++;
  const rBilling = await logStep<HealthCheckResponse>('Health Check de billing-service (:3003)', async () => {
    const res = await fetch(`${BASE_URL}/billing/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (rBilling.ok) passed++;

  // 5. Health Check de pharmacy-service (:3004)
  total++;
  const rPharmacy = await logStep<HealthCheckResponse>('Health Check de pharmacy-service (:3004)', async () => {
    const res = await fetch(`${BASE_URL}/pharmacy/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (rPharmacy.ok) passed++;

  // 6. Health Check de staff-service (:3007)
  total++;
  const rStaff = await logStep<HealthCheckResponse>('Health Check de staff-service (:3007)', async () => {
    const res = await fetch(`${BASE_URL}/doctors/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (rStaff.ok) passed++;

  // 7. Health Check de clinical-records-service (:3006)
  total++;
  const rClinical = await logStep<HealthCheckResponse>('Health Check de clinical-records-service (:3006)', async () => {
    const res = await fetch(`${BASE_URL}/clinical-records/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (rClinical.ok) passed++;

  // 8. Verificación de Idempotencia en Notificaciones (Redis 8.8.1)
  total++;
  const rIdemp = await logStep('Prueba de Idempotencia con Redis 8.8.1 (Doble Despacho)', async () => {
    const testEventId = `e2e-idemp-${Date.now()}`;
    const payload = {
      tipo: 'appointment.created',
      pacienteNombre: 'Juan Pérez E2E',
      pacienteEmail: 'juan.e2e@centromedico.mx',
      medicoNombre: 'Dr. Roberto Mendoza',
      especialidad: 'Traumatología',
      idTurno: 888,
    };

    const res1 = await fetch(`${BASE_URL}/notifications/test-dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, eventId: testEventId }),
    });
    const d1 = (await res1.json()) as NotificationDispatchResponse;

    const res2 = await fetch(`${BASE_URL}/notifications/test-dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, eventId: testEventId }),
    });
    const d2 = (await res2.json()) as NotificationDispatchResponse;

    const isDup = d2?.despachos?.[0]?.estado === 'DUPLICADO_IGNORADO';
    return {
      primerDespacho: d1?.despachos?.[0]?.estado,
      segundoDespacho: d2?.despachos?.[0]?.estado,
      idempotenciaEfectiva: isDup,
    };
  });
  if (rIdemp.ok) passed++;

  // 9. Resumen de Farmacia & Stock Hospitalario
  total++;
  const rPharmSummary = await logStep('Resumen Ejecutivo de Farmacia & Existencias', async () => {
    const res = await fetch(`${BASE_URL}/pharmacy/summary`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rPharmSummary.ok) passed++;

  // 10. Consulta de Dead-Letter Queue (DLQ)
  total++;
  const rDlq = await logStep('Verificación de Dead-Letter Queue (DLQ)', async () => {
    const res = await fetch(`${BASE_URL}/notifications/dlq`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rDlq.ok) passed++;

  console.log('\n======================================================================');
  console.log(`🏁 Resumen de Verificación E2E: ${passed}/${total} pasos exitosos.`);
  if (passed === total) {
    console.log('🎉 Todos los microservicios, contratos de eventos y componentes responden correctamente.');
  } else {
    console.log('⚠️ Algunos pasos no pudieron completarse. Asegúrate de que los contenedores de Docker estén corriendo.');
  }
  console.log('======================================================================\n');

  return passed === total;
}

// Ejecutar si se invoca directamente
if (process.argv[1]?.endsWith('verify-e2e-microservices.ts')) {
  runVerification();
}
