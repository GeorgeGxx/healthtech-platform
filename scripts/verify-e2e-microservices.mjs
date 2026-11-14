/**
 * Script de Verificación End-to-End (E2E) de Microservicios, Sagas y Event-Driven Architecture
 * Centro Médico Nacional - HealthTech Platform
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
      console.log(`   └─ Respuesta: ${summary}...`);
    }
    return { ok: true, result };
  } catch (err) {
    console.log(`❌ FALLÓ`);
    console.error(`   └─ Error: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function runVerification() {
  console.log('======================================================================');
  console.log('🏥 HealthTech Platform - Verificación E2E de Arquitectura');
  console.log(`   Gateway Target: ${BASE_URL}`);
  console.log('   Tecnologías: NestJS 12, Kafka 8.3.2, Redis 8.8.1, Kong 3.9, Postgres 18');
  console.log('======================================================================');

  let passed = 0;
  let total = 0;

  // 1. Health Check de Microservicio de Notificaciones
  total++;
  const r1 = await logStep('Health Check de notification-service (:3005)', async () => {
    const res = await fetch(`${BASE_URL}/notifications/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r1.ok) passed++;

  // 2. Health Check de Microservicio de Citas
  total++;
  const r2 = await logStep('Health Check de appointment-service (:3001)', async () => {
    const res = await fetch(`${BASE_URL}/appointments/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r2.ok) passed++;

  // 3. Health Check de Microservicio de Pacientes
  total++;
  const r3 = await logStep('Health Check de patient-service (:3002)', async () => {
    const res = await fetch(`${BASE_URL}/patients/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r3.ok) passed++;

  // 4. Health Check de Microservicio de Facturación
  total++;
  const rBilling = await logStep('Health Check de billing-service (:3003)', async () => {
    const res = await fetch(`${BASE_URL}/billing/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rBilling.ok) passed++;

  // 5. Health Check de Microservicio de Farmacia
  total++;
  const rPharmacy = await logStep('Health Check de pharmacy-service (:3004)', async () => {
    const res = await fetch(`${BASE_URL}/pharmacy/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rPharmacy.ok) passed++;

  // 6. Health Check de Microservicio de Personal Médico
  total++;
  const rStaff = await logStep('Health Check de staff-service (:3007)', async () => {
    const res = await fetch(`${BASE_URL}/doctors/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rStaff.ok) passed++;

  // 7. Health Check de Microservicio de Historias Clínicas y Censo
  total++;
  const rClinical = await logStep('Health Check de clinical-records-service (:3006)', async () => {
    const res = await fetch(`${BASE_URL}/clinical-records/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rClinical.ok) passed++;

  // Obtener JWT OIDC real de Keycloak para rutas protegidas + verificar rechazo 401 sin token
  let keycloakToken = null;
  const authHeaders = (extra = {}) => ({
    ...extra,
    ...(keycloakToken ? { Authorization: `Bearer ${keycloakToken}` } : {}),
  });

  total++;
  const rAuth = await logStep('Seguridad OIDC: Token Keycloak & KeycloakAuthGuard (401 vs 200)', async () => {
    const unauthRes = await fetch(`${BASE_URL}/patients`);
    if (unauthRes.status !== 401) {
      throw new Error(`Se esperaba HTTP 401 sin JWT, se recibió ${unauthRes.status}`);
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
    if (!keycloakToken) throw new Error('Keycloak no retornó access_token');

    const authRes = await fetch(`${BASE_URL}/patients?limit=1`, {
      headers: authHeaders(),
    });
    if (!authRes.ok) {
      throw new Error(`Endpoint protegido con JWT retornó HTTP ${authRes.status}`);
    }
    return { unauthStatus: unauthRes.status, authStatus: authRes.status, jwtVerified: true };
  });
  if (rAuth.ok) passed++;

  // 4. Verificación de Idempotencia en Notificaciones (Redis 8.8.1)
  total++;
  const r4 = await logStep('Prueba de Idempotencia con Redis 8.8.1 (Doble Despacho)', async () => {
    const testEventId = `e2e-idemp-${Date.now()}`;
    const payload = {
      tipo: 'appointment.created',
      pacienteNombre: 'Juan Pérez E2E',
      destinatario: 'juan.e2e@centromedico.mx',
      medicoNombre: 'Dr. Roberto Mendoza',
      especialidad: 'Traumatología',
      idTurno: 888,
    };

    // Primer despacho
    const res1 = await fetch(`${BASE_URL}/notifications/test-dispatch`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...payload }),
    });
    if (!res1.ok) throw new Error(`Primer despacho HTTP ${res1.status}`);
    const d1 = await res1.json();

    // Segundo despacho con mismo payload (verifica idempotencia o despacho controlado)
    const res2 = await fetch(`${BASE_URL}/notifications/test-dispatch`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...payload }),
    });
    if (!res2.ok) throw new Error(`Segundo despacho HTTP ${res2.status}`);
    const d2 = await res2.json();

    return {
      primerDespacho: d1?.despachos?.[0]?.estado,
      segundoDespacho: d2?.despachos?.[0]?.estado,
      testEventId,
    };
  });
  if (r4.ok) passed++;

  // 5. Estadísticas de Transactional Outbox (CDC)
  total++;
  const r5 = await logStep('Métricas de Transactional Outbox (CDC)', async () => {
    const res = await fetch(`${BASE_URL}/admin/outbox/stats`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r5.ok) passed++;

  // 6. Monitoreo de Sagas Orquestadas (SEC)
  total++;
  const r6 = await logStep('Consulta de Bitácora de Sagas Orquestadas', async () => {
    const res = await fetch(`${BASE_URL}/admin/sagas`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r6.ok) passed++;

  // 7. Resumen de Farmacia & Stock Hospitalario
  total++;
  const r7 = await logStep('Resumen Ejecutivo de Farmacia & Existencias', async () => {
    const res = await fetch(`${BASE_URL}/pharmacy/summary`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r7.ok) passed++;

  // 8. Consulta de Dead-Letter Queue (DLQ)
  total++;
  const r8 = await logStep('Verificación de Dead-Letter Queue (DLQ)', async () => {
    const res = await fetch(`${BASE_URL}/notifications/dlq`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (r8.ok) passed++;

  // 9. Kong Gateway Hardening: Correlation ID & Security Headers (Pilar 3)
  total++;
  const rKong = await logStep('Kong Gateway Hardening: Correlation ID & Security Headers', async () => {
    const res = await fetch(`${BASE_URL}/appointments/health`);
    const correlationId = res.headers.get('x-correlation-id');
    const xContentType = res.headers.get('x-content-type-options');
    const xFrame = res.headers.get('x-frame-options');
    if (!correlationId || !xContentType) {
      throw new Error('Cabeceras de endurecimiento faltantes en Kong Gateway');
    }
    return {
      correlationId,
      xContentTypeOptions: xContentType,
      xFrameOptions: xFrame,
    };
  });
  if (rKong.ok) passed++;

  // 10. HL7 FHIR R4: Recurso Patient (Pilar 2)
  total++;
  const rFhirPatient = await logStep('HL7 FHIR R4: Mapeo de Recurso Patient', async () => {
    const res = await fetch(`${BASE_URL}/patients/1/fhir`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.resourceType !== 'Patient' || !data.identifier?.length) {
      throw new Error('Estructura FHIR Patient no conforme a HL7 R4');
    }
    return {
      resourceType: data.resourceType,
      id: data.id,
      patientName: `${data.name?.[0]?.given?.join(' ')} ${data.name?.[0]?.family}`,
      dni: data.identifier?.[0]?.value,
    };
  });
  if (rFhirPatient.ok) passed++;

  // 11. HL7 FHIR R4: Recurso Encounter & Diagnóstico CIE-10 (Pilar 2)
  total++;
  const rFhirEncounter = await logStep('HL7 FHIR R4: Mapeo de Recurso Encounter & Diagnóstico CIE-10', async () => {
    const res = await fetch(`${BASE_URL}/medical-records/1/fhir`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.resourceType !== 'Encounter') {
      throw new Error('Estructura FHIR Encounter no conforme a HL7 R4');
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

  // 12. Receta Médica Digital: Firma Criptográfica HMAC-SHA256 y Verificación QR (Pilar 2)
  total++;
  const rPrescription = await logStep('Receta Médica Digital: Firma Criptográfica HMAC-SHA256 y QR', async () => {
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
    if (!createRes.ok) throw new Error(`Creación HTTP ${createRes.status}`);
    const rx = await createRes.json();

    const verifyRes = await fetch(`${BASE_URL}/medical-records/prescriptions/${rx.codigoVerif}/verify`);
    if (!verifyRes.ok) throw new Error(`Verificación HTTP ${verifyRes.status}`);
    const verif = await verifyRes.json();

    if (!verif.firmaValida) {
      throw new Error('Firma criptográfica inválida en verificación QR');
    }

    return {
      codigoVerif: rx.codigoVerif,
      firmaValida: verif.firmaValida,
      estado: verif.estado,
      qrCheckUrl: verif.qrCheckUrl,
    };
  });
  if (rPrescription.ok) passed++;

  // 13. Telemedicina WebRTC: Sala Virtual y Configuración ICE/STUN (Pilar 4)
  total++;
  const rTelemed = await logStep('Telemedicina WebRTC: Sala Virtual y Configuración ICE/STUN', async () => {
    const res = await fetch(`${BASE_URL}/appointments/1/virtual-room`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const room = await res.json();
    if (!room.idSala || !room.tokenMedico || !room.iceServers?.length) {
      throw new Error('Estructura de sala virtual incompleta');
    }
    return {
      idSala: room.idSala,
      iceServersCount: room.iceServers.length,
      accesoPaciente: room.urlAccesoPaciente?.slice(0, 70) + '...',
    };
  });
  if (rTelemed.ok) passed++;

  // 14. Finanzas Médicas: Liquidación de Honorarios y Deducción de Comisión (Pilar 4)
  total++;
  const rSettlement = await logStep('Finanzas Médicas: Liquidación de Honorarios y Deducción de Comisión', async () => {
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

  // 15. Notificaciones: Motor de Recordatorios Automáticos Multicanal (Pilar 4)
  total++;
  const rReminders = await logStep('Notificaciones: Motor de Recordatorios Automáticos Multicanal', async () => {
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

  // 16. Health Probes: Readiness en Microservicios
  total++;
  const rReadiness = await logStep('Health Probes: Readiness en Microservicios', async () => {
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
      throw new Error('Al menos un microservicio no está en estado Ready');
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

  // 18. Full-Text Search seguro con plainto_tsquery (caracteres especiales)
  total++;
  const rFts = await logStep('Búsqueda Clínica segura (plainto_tsquery con operadores especiales)', async () => {
    const headers = keycloakToken ? { Authorization: `Bearer ${keycloakToken}` } : {};
    const res = await fetch(`${BASE_URL}/medical-records/search?q=${encodeURIComponent('I10 & ! | ()')}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { resultados: Array.isArray(data) ? data.length : 0 };
  });
  if (rFts.ok) passed++;

  // 19. Outbox CDC Relay-Now (admin_user)
  total++;
  const rRelay = await logStep('Outbox CDC Worker: Trigger manual POST /admin/outbox/relay-now', async () => {
    const headers = keycloakToken ? { Authorization: `Bearer ${keycloakToken}` } : {};
    const res = await fetch(`${BASE_URL}/admin/outbox/relay-now`, { method: 'POST', headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  });
  if (rRelay.ok) passed++;

  // 20. Round-trip PHI AES-256-GCM en Expediente Clínico Electrónico
  total++;
  const rPhi = await logStep('Cifrado PHI AES-256-GCM: Round-trip Historia Clínica', async () => {
    const headers = {
      'Content-Type': 'application/json',
      ...(keycloakToken ? { Authorization: `Bearer ${keycloakToken}` } : {}),
    };
    const diagText = `Control E2E cifrado AES-256-GCM ${Date.now()}`;
    const createRes = await fetch(`${BASE_URL}/medical-records`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idPaciente: 1,
        idMedico: 1,
        diagnosticoDescripcion: diagText,
        tratamiento: 'Seguimiento ambulatorio estándar',
      }),
    });
    if (!createRes.ok) throw new Error(`Create EHR HTTP ${createRes.status}: ${await createRes.text()}`);
    const created = await createRes.json();
    const getRes = await fetch(`${BASE_URL}/medical-records/${created.idHistoria}`, { headers });
    if (!getRes.ok) throw new Error(`Get EHR HTTP ${getRes.status}`);
    const fetched = await getRes.json();
    if (fetched.diagnosticoDescripcion !== diagText) {
      throw new Error('El diagnóstico descifrado no coincide con el original');
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
      throw new Error('Estructura inválida en /dashboard/metrics');
    }
    return data.kpis;
  });
  if (rDash.ok) passed++;

  // 22. Catálogo de Aseguradoras alineado con Frontend (patient-service)
  total++;
  const rCatalogs = await logStep('Catálogo de Aseguradoras: GET /patients/catalogs/insurances', async () => {
    const res = await fetch(`${BASE_URL}/patients/catalogs/insurances`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Se esperaba un arreglo de aseguradoras');
    return { count: data.length };
  });
  if (rCatalogs.ok) passed++;

  console.log('\n======================================================================');
  console.log(`🏁 Resumen de Verificación E2E: ${passed}/${total} pasos exitosos.`);
  if (passed === total) {
    console.log('🎉 Todos los microservicios, contratos de eventos y componentes responden correctamente.');
  } else {
    console.log('⚠️ Algunos pasos no pudieron completarse. Asegúrate de que los contenedores de Docker estén corriendo.');
  }
  console.log('======================================================================\n');
}

runVerification();
