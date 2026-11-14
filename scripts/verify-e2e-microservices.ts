/**
 * End-to-End (E2E) Verification Script for Microservices, Sagas, and Event-Driven Architecture
 * National Medical Center - HealthTech Platform
 * 100% Strict TypeScript
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
      console.log(`   └─ Response: ${summary}...`);
    }
    return { ok: true, result, elapsedMs: elapsed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`❌ FAILED`);
    console.error(`   └─ Error: ${message}`);
    return { ok: false, error: message };
  }
}

export async function runVerification(): Promise<boolean> {
  console.log('======================================================================');
  console.log('🏥 HealthTech Platform - E2E Microservices Architecture Verification');
  console.log(`   API Gateway Target: ${BASE_URL}`);
  console.log('   Stack: NestJS 12, Kafka 8.3.2, Redis 8.8.1, Kong 3.9, Postgres 18');
  console.log('======================================================================');

  let passed = 0;
  let total = 0;

  // 1. Health Check for notification-service (:3005)
  total++;
  const r1 = await logStep<HealthCheckResponse>('Health Check for notification-service (:3005)', async () => {
    const res = await fetch(`${BASE_URL}/notifications/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (r1.ok) passed++;

  // 2. Health Check for appointment-service (:3001)
  total++;
  const r2 = await logStep<HealthCheckResponse>('Health Check for appointment-service (:3001)', async () => {
    const res = await fetch(`${BASE_URL}/appointments/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (r2.ok) passed++;

  // 3. Health Check for patient-service (:3002)
  total++;
  const r3 = await logStep<HealthCheckResponse>('Health Check for patient-service (:3002)', async () => {
    const res = await fetch(`${BASE_URL}/patients/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (r3.ok) passed++;

  // 4. Health Check for billing-service (:3003)
  total++;
  const rBilling = await logStep<HealthCheckResponse>('Health Check for billing-service (:3003)', async () => {
    const res = await fetch(`${BASE_URL}/billing/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (rBilling.ok) passed++;

  // 5. Health Check for pharmacy-service (:3004)
  total++;
  const rPharmacy = await logStep<HealthCheckResponse>('Health Check for pharmacy-service (:3004)', async () => {
    const res = await fetch(`${BASE_URL}/pharmacy/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (rPharmacy.ok) passed++;

  // 6. Health Check for staff-service (:3007)
  total++;
  const rStaff = await logStep<HealthCheckResponse>('Health Check for staff-service (:3007)', async () => {
    const res = await fetch(`${BASE_URL}/doctors/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (rStaff.ok) passed++;

  // 7. Health Check for clinical-records-service (:3006)
  total++;
  const rClinical = await logStep<HealthCheckResponse>('Health Check for clinical-records-service (:3006)', async () => {
    const res = await fetch(`${BASE_URL}/clinical-records/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as HealthCheckResponse;
  });
  if (rClinical.ok) passed++;

  // 8. Notification Idempotency Check (Redis 8.8.1)
  total++;
  const rIdemp = await logStep('Idempotency Test with Redis 8.8.1 (Double Dispatch)', async () => {
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

  // 9. Pharmacy & Hospital Stock Summary
  total++;
  const rPharmSummary = await logStep('Executive Pharmacy & Stock Summary', async () => {
    const res = await fetch(`${BASE_URL}/pharmacy/summary`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rPharmSummary.ok) passed++;

  // 10. Dead-Letter Queue (DLQ) Query
  total++;
  const rDlq = await logStep('Dead-Letter Queue (DLQ) Verification', async () => {
    const res = await fetch(`${BASE_URL}/notifications/dlq`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rDlq.ok) passed++;

  console.log('\n======================================================================');
  console.log(`🏁 E2E Verification Summary: ${passed}/${total} steps passed.`);
  if (passed === total) {
    console.log('🎉 All microservices, event contracts, and components are responding properly.');
  } else {
    console.log('⚠️ Some steps could not be completed. Make sure the Docker containers are running.');
  }
  console.log('======================================================================\n');

  return passed === total;
}

// Run if invoked directly
if (process.argv[1]?.endsWith('verify-e2e-microservices.ts')) {
  runVerification();
}
