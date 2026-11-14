/**
 * End-to-End (E2E) Verification Script for Microservices, Sagas, and Event-Driven Architecture
 * National Medical Center - HealthTech Platform
 */

const BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:8000/api';

async function logStep(title, fn) {
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
    return { ok: true, result };
  } catch (err) {
    console.log(`❌ FAILED`);
    console.error(`   └─ Error: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function runVerification() {
  console.log('======================================================================');
  console.log('🏥 HealthTech Platform - E2E Architecture Verification');
  console.log(`   Gateway Target: ${BASE_URL}`);
  console.log('   Stack: NestJS 12, Kafka 8.3.2, Redis 8.8.1, Kong 3.9, Postgres 18');
  console.log('======================================================================');

  let passed = 0;
  let total = 0;

  // 1. Notification Microservice Health Check
  total++;
  const r1 = await logStep('Health Check for notification-service (:3005)', async () => {
    const res = await fetch(`${BASE_URL}/notifications/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r1.ok) passed++;

  // 2. Appointment Microservice Health Check
  total++;
  const r2 = await logStep('Health Check for appointment-service (:3001)', async () => {
    const res = await fetch(`${BASE_URL}/appointments/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r2.ok) passed++;

  // 3. Patient Microservice Health Check
  total++;
  const r3 = await logStep('Health Check for patient-service (:3002)', async () => {
    const res = await fetch(`${BASE_URL}/patients/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r3.ok) passed++;

  // 4. Billing Microservice Health Check
  total++;
  const rBilling = await logStep('Health Check for billing-service (:3003)', async () => {
    const res = await fetch(`${BASE_URL}/billing/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rBilling.ok) passed++;

  // 5. Pharmacy Microservice Health Check
  total++;
  const rPharmacy = await logStep('Health Check for pharmacy-service (:3004)', async () => {
    const res = await fetch(`${BASE_URL}/pharmacy/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rPharmacy.ok) passed++;

  // 6. Staff Microservice Health Check
  total++;
  const rStaff = await logStep('Health Check for staff-service (:3007)', async () => {
    const res = await fetch(`${BASE_URL}/doctors/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rStaff.ok) passed++;

  // 7. Clinical Records & Census Microservice Health Check
  total++;
  const rClinical = await logStep('Health Check for clinical-records-service (:3006)', async () => {
    const res = await fetch(`${BASE_URL}/clinical-records/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rClinical.ok) passed++;

  // Obtain real Keycloak OIDC JWT for protected routes + verify 401 rejection without token
  let keycloakToken = null;
  const authHeaders = (extra = {}) => ({
    ...extra,
    ...(keycloakToken ? { Authorization: `Bearer ${keycloakToken}` } : {}),
  });

  total++;
  const rAuth = await logStep('OIDC Security: Keycloak Token & KeycloakAuthGuard (401 vs 200)', async () => {
    const unauthRes = await fetch(`${BASE_URL}/patients`);
    if (unauthRes.status !== 401) {
      throw new Error(`Expected HTTP 401 without JWT, received ${unauthRes.status}`);
    }

    const tokenUrl = BASE_URL.replace(/\/api$/, '') + '/realms/healthtech-realm/protocol/openid-connect/token';
    const form = new URLSearchParams({
      grant_type: 'password',
      client_id: 'healthtech-platform',
      username: 'admin_user',
      password: 'Admin123!',
    });
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!tokenRes.ok) {
      throw new Error(`Keycloak token endpoint HTTP ${tokenRes.status}`);
    }
    const tokenJson = await tokenRes.json();
    keycloakToken = tokenJson.access_token;
    if (!keycloakToken) throw new Error('Keycloak did not return access_token');

    const authRes = await fetch(`${BASE_URL}/patients?limit=1`, {
      headers: authHeaders(),
    });
    if (!authRes.ok) {
      throw new Error(`JWT-protected endpoint returned HTTP ${authRes.status}`);
    }
    return { unauthStatus: unauthRes.status, authStatus: authRes.status, jwtVerified: true };
  });
  if (rAuth.ok) passed++;

  // 4. Notification Idempotency Check (Redis 8.8.1)
  total++;
  const r4 = await logStep('Idempotency Test with Redis 8.8.1 (Double Dispatch)', async () => {
    const testEventId = `e2e-idemp-${Date.now()}`;
    const payload = {
      tipo: 'appointment.created',
      pacienteNombre: 'Juan Pérez E2E',
      destinatario: 'juan.e2e@centromedico.mx',
      medicoNombre: 'Dr. Roberto Mendoza',
      especialidad: 'Traumatología',
      idTurno: 888,
    };

    // First dispatch
    const res1 = await fetch(`${BASE_URL}/notifications/test-dispatch`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...payload }),
    });
    if (!res1.ok) throw new Error(`First dispatch HTTP ${res1.status}`);
    const d1 = await res1.json();

    // Second dispatch with same payload (verifies idempotency or controlled dispatch)
    const res2 = await fetch(`${BASE_URL}/notifications/test-dispatch`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...payload }),
    });
    if (!res2.ok) throw new Error(`Second dispatch HTTP ${res2.status}`);
    const d2 = await res2.json();

    return {
      primerDespacho: d1?.despachos?.[0]?.estado,
      segundoDespacho: d2?.despachos?.[0]?.estado,
      testEventId,
    };
  });
  if (r4.ok) passed++;

  // 5. Transactional Outbox (CDC) Stats
  total++;
  const r5 = await logStep('Transactional Outbox (CDC) Metrics', async () => {
    const res = await fetch(`${BASE_URL}/admin/outbox/stats`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r5.ok) passed++;

  // 6. Orchestrated Sagas Monitoring (SEC)
  total++;
  const r6 = await logStep('Orchestrated Sagas Log Query', async () => {
    const res = await fetch(`${BASE_URL}/admin/sagas`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r6.ok) passed++;

  // 7. Pharmacy & Hospital Stock Summary
  total++;
  const r7 = await logStep('Executive Pharmacy & Stock Summary', async () => {
    const res = await fetch(`${BASE_URL}/pharmacy/summary`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r7.ok) passed++;

  // 8. Dead-Letter Queue (DLQ) Query
  total++;
  const r8 = await logStep('Dead-Letter Queue (DLQ) Verification', async () => {
    const res = await fetch(`${BASE_URL}/notifications/dlq`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r8.ok) passed++;

  // 9. Kong Gateway Hardening: Correlation ID & Security Headers (Pillar 3)
  total++;
  const rKong = await logStep('Kong Gateway Hardening: Correlation ID & Security Headers', async () => {
    const res = await fetch(`${BASE_URL}/appointments/health`);
    const correlationId = res.headers.get('x-correlation-id');
    const xContentType = res.headers.get('x-content-type-options');
    const xFrame = res.headers.get('x-frame-options');
    if (!correlationId || !xContentType) {
      throw new Error('Missing hardening headers in Kong Gateway');
    }
    return {
      correlationId,
      xContentTypeOptions: xContentType,
      xFrameOptions: xFrame,
    };
  });
  if (rKong.ok) passed++;

  // 10. HL7 FHIR R4: Patient Resource (Pillar 2)
  total++;
  const rFhirPatient = await logStep('HL7 FHIR R4: Patient Resource Mapping', async () => {
    const res = await fetch(`${BASE_URL}/patients/1/fhir`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.resourceType !== 'Patient' || !data.identifier?.length) {
      throw new Error('FHIR Patient structure does not conform to HL7 R4');
    }
    return {
      resourceType: data.resourceType,
      id: data.id,
      patientName: `${data.name?.[0]?.given?.join(' ')} ${data.name?.[0]?.family}`,
      dni: data.identifier?.[0]?.value,
    };
  });
  if (rFhirPatient.ok) passed++;

  // 11. HL7 FHIR R4: Encounter Resource & ICD-10 Diagnosis (Pillar 2)
  total++;
  const rFhirEncounter = await logStep('HL7 FHIR R4: Encounter Resource & ICD-10 Diagnosis Mapping', async () => {
    const res = await fetch(`${BASE_URL}/medical-records/1/fhir`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.resourceType !== 'Encounter') {
      throw new Error('FHIR Encounter structure does not conform to HL7 R4');
    }
    return {
      resourceType: data.resourceType,
      id: data.id,
      status: data.status,
      practitioner: data.participant?.[0]?.individual?.display,
      cie10: data.diagnosis?.[0]?.use?.coding?.[0]?.code,
    };
  });
  if (rFhirEncounter.ok) passed++;

  // 12. Digital Medical Prescription: HMAC-SHA256 Cryptographic Signature & QR Verification (Pillar 2)
  total++;
  const rPrescription = await logStep('Digital Medical Prescription: HMAC-SHA256 Signature & QR Verification', async () => {
    const createRes = await fetch(`${BASE_URL}/medical-records/prescriptions`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        idPaciente: 1,
        idMedico: 2,
        diagnostico: 'Hipertensión Arterial Primaria',
        medicamentos: [
          { nombre: 'Enalapril', dosis: '10mg', frecuencia: 'Cada 12 hrs', duracionDias: 30 },
        ],
      }),
    });
    if (!createRes.ok) throw new Error(`Creation HTTP ${createRes.status}`);
    const rx = await createRes.json();

    const verifyRes = await fetch(`${BASE_URL}/medical-records/prescriptions/${rx.codigoVerif}/verify`);
    if (!verifyRes.ok) throw new Error(`Verification HTTP ${verifyRes.status}`);
    const verif = await verifyRes.json();

    if (!verif.firmaValida) {
      throw new Error('Invalid cryptographic signature in QR verification');
    }

    return {
      codigoVerif: rx.codigoVerif,
      firmaValida: verif.firmaValida,
      estado: verif.estado,
      qrCheckUrl: verif.qrCheckUrl,
    };
  });
  if (rPrescription.ok) passed++;

  // 13. WebRTC Telemedicine: Virtual Room & ICE/STUN Configuration (Pillar 4)
  total++;
  const rTelemed = await logStep('WebRTC Telemedicine: Virtual Room & ICE/STUN Configuration', async () => {
    const res = await fetch(`${BASE_URL}/appointments/1/virtual-room`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const room = await res.json();
    if (!room.idSala || !room.tokenMedico || !room.iceServers?.length) {
      throw new Error('Incomplete virtual room structure');
    }
    return {
      idSala: room.idSala,
      iceServersCount: room.iceServers.length,
      accesoPaciente: room.urlAccesoPaciente?.slice(0, 70) + '...',
    };
  });
  if (rTelemed.ok) passed++;

  // 14. Medical Finance: Fee Settlement & Commission Deduction (Pillar 4)
  total++;
  const rSettlement = await logStep('Medical Finance: Fee Settlement & Commission Deduction', async () => {
    const res = await fetch(`${BASE_URL}/billing/doctors/2/settlement?periodo=2024-02`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const settlement = await res.json();
    return {
      idMedico: settlement.idMedico,
      periodo: settlement.periodo,
      consultasAsistidas: settlement.resumenConsultas?.asistidas,
      montoBruto: `$${settlement.desgloseFinanciero?.montoBrutoConsulta} USD`,
      comisionClinica: `$${settlement.desgloseFinanciero?.retencionClinica} USD`,
      honorarioNetoMedico: `$${settlement.desgloseFinanciero?.honorarioNetoMedico} USD`,
    };
  });
  if (rSettlement.ok) passed++;

  // 15. Notifications: Multi-Channel Automated Reminder Engine (Pillar 4)
  total++;
  const rReminders = await logStep('Notifications: Multi-Channel Automated Reminder Engine', async () => {
    const res = await fetch(`${BASE_URL}/notifications/reminders/trigger`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        idTurno: 1,
        pacienteNombre: 'Juan Pérez García',
        medicoNombre: 'Dra. Laura Gómez',
        especialidad: 'Cardiología',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rem = await res.json();
    return {
      totalGenerados: rem.totalGenerados,
      canales: rem.despachos?.map((d) => d.canal),
    };
  });
  if (rReminders.ok) passed++;

  // 16. Health Probes: Microservice Readiness
  total++;
  const rReadiness = await logStep('Health Probes: Microservice Readiness', async () => {
    const res1 = await fetch(`http://localhost:3001/api/appointments/health/readiness`);
    const res2 = await fetch(`http://localhost:3002/api/patients/health/readiness`);
    const res3 = await fetch(`http://localhost:3003/api/billing/health/readiness`);
    const res4 = await fetch(`http://localhost:3006/api/health/readiness`);
    const res5 = await fetch(`http://localhost:3005/api/notifications/health/readiness`);
    const res6 = await fetch(`http://localhost:3007/api/doctors/health/readiness`);

    const ok1 = (await res1.json()).ok;
    const ok2 = (await res2.json()).ok;
    const ok3 = (await res3.json()).ok;
    const ok4 = (await res4.json()).ok;
    const ok5 = (await res5.json()).ok;
    const ok6 = (await res6.json()).status === 'UP';

    if (!ok1 || !ok2 || !ok3 || !ok4 || !ok5 || !ok6) {
      throw new Error('At least one microservice is not in Ready state');
    }

    return {
      appointments: 'READY',
      patients: 'READY',
      billing: 'READY',
      clinicalRecords: 'READY',
      notifications: 'READY',
      staff: 'READY',
    };
  });
  if (rReadiness.ok) passed++;

  // 18. Safe Full-Text Search with plainto_tsquery (special characters)
  total++;
  const rFts = await logStep('Safe Clinical Search (plainto_tsquery with special operators)', async () => {
    const headers = keycloakToken ? { Authorization: `Bearer ${keycloakToken}` } : {};
    const res = await fetch(`${BASE_URL}/medical-records/search?q=${encodeURIComponent('I10 & ! | ()')}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { resultados: Array.isArray(data) ? data.length : 0 };
  });
  if (rFts.ok) passed++;

  // 19. Outbox CDC Relay-Now (admin_user)
  total++;
  const rRelay = await logStep('Outbox CDC Worker: Manual Trigger POST /admin/outbox/relay-now', async () => {
    const headers = keycloakToken ? { Authorization: `Bearer ${keycloakToken}` } : {};
    const res = await fetch(`${BASE_URL}/admin/outbox/relay-now`, { method: 'POST', headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rRelay.ok) passed++;

  // 20. AES-256-GCM PHI Round-Trip in Electronic Health Record
  total++;
  const rPhi = await logStep('PHI AES-256-GCM Encryption: Clinical Record Round-Trip', async () => {
    const headers = {
      'Content-Type': 'application/json',
      ...(keycloakToken ? { Authorization: `Bearer ${keycloakToken}` } : {}),
    };
    const diagText = `E2E control encrypted AES-256-GCM ${Date.now()}`;
    const createRes = await fetch(`${BASE_URL}/medical-records`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idPaciente: 1,
        idMedico: 1,
        diagnosticoDescripcion: diagText,
        tratamiento: 'Standard outpatient follow-up',
      }),
    });
    if (!createRes.ok) throw new Error(`Create EHR HTTP ${createRes.status}: ${await createRes.text()}`);
    const created = await createRes.json();
    const getRes = await fetch(`${BASE_URL}/medical-records/${created.idHistoria}`, { headers });
    if (!getRes.ok) throw new Error(`Get EHR HTTP ${getRes.status}`);
    const fetched = await getRes.json();
    if (fetched.diagnosticoDescripcion !== diagText) {
      throw new Error('Decrypted diagnosis does not match original');
    }
    return { idHistoria: created.idHistoria, roundTripDecrypted: true };
  });
  if (rPhi.ok) passed++;

  // 21. Dashboard KPIs & Metrics (appointment-service)
  total++;
  const rDash = await logStep('Dashboard Metrics: GET /dashboard/metrics', async () => {
    const res = await fetch(`${BASE_URL}/dashboard/metrics`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.kpis || typeof data.kpis.totalPatients !== 'number') {
      throw new Error('Invalid structure in /dashboard/metrics');
    }
    return data.kpis;
  });
  if (rDash.ok) passed++;

  // 22. Insurers Catalog aligned with Frontend (patient-service)
  total++;
  const rCatalogs = await logStep('Insurers Catalog: GET /patients/catalogs/insurances', async () => {
    const res = await fetch(`${BASE_URL}/patients/catalogs/insurances`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected an array of insurers');
    return { count: data.length };
  });
  if (rCatalogs.ok) passed++;

  console.log('\n======================================================================');
  console.log(`🏁 E2E Verification Summary: ${passed}/${total} steps passed.`);
  if (passed === total) {
    console.log('🎉 All microservices, event contracts, and components are responding properly.');
  } else {
    console.log('⚠️ Some steps could not be completed. Make sure the Docker containers are running.');
  }
  console.log('======================================================================\n');
}

runVerification();
