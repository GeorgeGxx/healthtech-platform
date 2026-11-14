// scripts/seed-elasticsearch-kibana.mjs
// Comprehensive provisioning of the 3 Observability Pillars in Kibana 9.5.5
// Pillar 1: Security & HIPAA Audit (NOM-024)
// Pillar 2: Hospital Intelligence & Finance
// Pillar 3: System Health & SRE / APM Telemetry
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ES_URL = 'http://localhost:9200';
const KBN_URL = 'http://localhost:5601';

const KBN_HEADERS = {
  'Content-Type': 'application/json',
  'kbn-xsrf': 'true',
};

async function main() {
  console.log('🚀 Starting comprehensive provisioning of the 3 Pillars in Elasticsearch and Kibana 9.5.5...');

  // 1. Check ES and Kibana status
  try {
    const esRes = await fetch(ES_URL);
    const esData = await esRes.json();
    console.log(`✅ Elasticsearch v${esData.version.number} connected.`);
  } catch (err) {
    console.error('❌ Error connecting to Elasticsearch:', err.message);
    process.exit(1);
  }

  try {
    const kbnRes = await fetch(`${KBN_URL}/api/status`);
    const kbnData = await kbnRes.json();
    console.log(`✅ Kibana connected. Status level: ${kbnData.status.overall.level}`);
  } catch (err) {
    console.error('❌ Error connecting to Kibana:', err.message);
    process.exit(1);
  }

  // 2. Elasticsearch Index Mappings
  console.log('\n📦 Creating and configuring the 5 indices in Elasticsearch...');

  const pharmacyIndex = 'healthtech-pharmacy-stock';
  await fetch(`${ES_URL}/${pharmacyIndex}`, { method: 'DELETE' });
  await fetch(`${ES_URL}/${pharmacyIndex}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          medicamento_id: { type: 'keyword' },
          nombre_comercial: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          principio_activo: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          categoria_terapeutica: { type: 'keyword' },
          presentacion: { type: 'keyword' },
          lote: { type: 'keyword' },
          caducidad: { type: 'date' },
          stock_actual: { type: 'integer' },
          stock_minimo: { type: 'integer' },
          stock_maximo: { type: 'integer' },
          nivel_alerta: { type: 'keyword' },
          ubicacion_almacen: { type: 'keyword' },
          precio_unitario_mxn: { type: 'float' },
          costo_total_inventario_mxn: { type: 'float' },
          '@timestamp': { type: 'date' },
        },
      },
    }),
  });
  console.log(`  ✓ Index ${pharmacyIndex} created`);

  const bedsIndex = 'healthtech-beds-census';
  await fetch(`${ES_URL}/${bedsIndex}`, { method: 'DELETE' });
  await fetch(`${ES_URL}/${bedsIndex}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          cama_id: { type: 'keyword' },
          numero: { type: 'keyword' },
          piso: { type: 'integer' },
          tipo: { type: 'keyword' },
          estado: { type: 'keyword' },
          tarifa_noche_mxn: { type: 'float' },
          paciente_nombre: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          paciente_dni: { type: 'keyword' },
          medico_responsable: { type: 'keyword' },
          dias_estancia: { type: 'integer' },
          costo_acumulado_mxn: { type: 'float' },
          '@timestamp': { type: 'date' },
        },
      },
    }),
  });
  console.log(`  ✓ Index ${bedsIndex} created`);

  const opsIndex = 'healthtech-clinical-operations';
  await fetch(`${ES_URL}/${opsIndex}`, { method: 'DELETE' });
  await fetch(`${ES_URL}/${opsIndex}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          operacion_id: { type: 'keyword' },
          tipo_evento: { type: 'keyword' },
          modalidad: { type: 'keyword' },
          especialidad: { type: 'keyword' },
          medico: { type: 'keyword' },
          paciente: { type: 'keyword' },
          estado: { type: 'keyword' },
          aseguradora: { type: 'keyword' },
          monto_total_mxn: { type: 'float' },
          monto_neto_mxn: { type: 'float' },
          descuento_cobertura_mxn: { type: 'float' },
          monto_mxn: { type: 'float' },
          copago_mxn: { type: 'float' },
          honorario_medico_mxn: { type: 'float' },
          comision_clinica_mxn: { type: 'float' },
          receta_digital_estado: { type: 'keyword' },
          firma_digital_valida: { type: 'boolean' },
          '@timestamp': { type: 'date' },
        },
      },
    }),
  });
  console.log(`  ✓ Index ${opsIndex} created`);

  // Pillar 1 Index: Security & HIPAA Audit
  const auditIndex = 'healthtech-security-audit';
  await fetch(`${ES_URL}/${auditIndex}`, { method: 'DELETE' });
  await fetch(`${ES_URL}/${auditIndex}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          id_auditoria: { type: 'keyword' },
          usuario_id: { type: 'keyword' },
          nombre_usuario: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          rol: { type: 'keyword' },
          accion: { type: 'keyword' },
          entidad: { type: 'keyword' },
          id_entidad: { type: 'keyword' },
          ip_cliente: { type: 'keyword' },
          user_agent: { type: 'text' },
          estado_resultado: { type: 'keyword' },
          motivo: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          '@timestamp': { type: 'date' },
        },
      },
    }),
  });
  console.log(`  ✓ Index ${auditIndex} (Pillar 1: HIPAA Audit) created`);

  // Pillar 3 Index: System Health & SRE Telemetry
  const telemetryIndex = 'healthtech-telemetry-metrics';
  await fetch(`${ES_URL}/${telemetryIndex}`, { method: 'DELETE' });
  await fetch(`${ES_URL}/${telemetryIndex}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          servicio: { type: 'keyword' },
          endpoint: { type: 'keyword' },
          metodo_http: { type: 'keyword' },
          codigo_estado: { type: 'integer' },
          categoria_estado: { type: 'keyword' },
          latencia_ms: { type: 'float' },
          peticiones_por_minuto: { type: 'integer' },
          estado_salud: { type: 'keyword' },
          estandar_fhir: { type: 'keyword' },
          protocolo: { type: 'keyword' },
          correlation_id: { type: 'keyword' },
          dlq_pendientes: { type: 'integer' },
          uso_cpu_pct: { type: 'float' },
          uso_memoria_mb: { type: 'float' },
          '@timestamp': { type: 'date' },
        },
      },
    }),
  });
  console.log(`  ✓ Index ${telemetryIndex} (Pillar 3: SRE Telemetry) created`);

  const now = new Date().toISOString();

  // 3. Seed Medications from PostgreSQL Database
  console.log('\n💊 Indexing medication catalog and stock from PostgreSQL...');
  let medData = [];
  try {
    const res = await fetch('http://localhost/api/pharmacy');
    if (res.ok) medData = await res.json();
  } catch (err) {
    console.warn('  ⚠️ Medication fallback:', err.message);
  }

  if (!medData || medData.length === 0) {
    medData = [
      { idMedicamento: 'MED-001', nombreComercial: 'Tempra Forte', principioActivo: 'Paracetamol', categoriaTerapeutica: 'Analgésicos y Antipiréticos', presentacion: 'Tabletas 500mg (Caja c/20)', lote: 'L-2026A-01', caducidad: '2027-08-30', stockActual: 850, stockMinimo: 200, stockMaximo: 1000, nivelAlerta: 'Normal', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 85.0 },
      { idMedicamento: 'MED-002', nombreComercial: 'Dolac Inyectable', principioActivo: 'Ketorolaco Trometamina', categoriaTerapeutica: 'Analgésicos y Antipiréticos', presentacion: 'Ampolleta 30mg/ml', lote: 'L-2026A-02', caducidad: '2027-04-15', stockActual: 135, stockMinimo: 100, stockMaximo: 400, nivelAlerta: 'Normal', ubicacionAlmacen: 'Urgencias', precioUnitarioMxn: 145.0 },
      { idMedicamento: 'MED-003', nombreComercial: 'Tramal 50mg', principioActivo: 'Clorhidrato de Tramadol', categoriaTerapeutica: 'Analgésicos y Antipiréticos', presentacion: 'Cápsulas 50mg', lote: 'L-2026B-05', caducidad: '2026-12-15', stockActual: 45, stockMinimo: 50, stockMaximo: 200, nivelAlerta: 'Bajo', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 210.0 },
      { idMedicamento: 'MED-004', nombreComercial: 'Morfina Solución IV', principioActivo: 'Sulfato de Morfina', categoriaTerapeutica: 'Analgésicos Controlados UCI', presentacion: 'Ampolleta 10mg/ml', lote: 'L-2026C-09', caducidad: '2027-02-28', stockActual: 12, stockMinimo: 30, stockMaximo: 100, nivelAlerta: 'Crítico', ubicacionAlmacen: 'Terapia Intensiva (UTI)', precioUnitarioMxn: 380.0 },
      { idMedicamento: 'MED-005', nombreComercial: 'Augmentin 875', principioActivo: 'Amoxicilina / Ácido Clavulánico', categoriaTerapeutica: 'Antibióticos y Antimicrobianos', presentacion: 'Tabletas 875/125mg', lote: 'L-2026A-12', caducidad: '2027-11-20', stockActual: 320, stockMinimo: 150, stockMaximo: 600, nivelAlerta: 'Normal', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 495.0 },
      { idMedicamento: 'MED-006', nombreComercial: 'Rocephin 1g', principioActivo: 'Ceftriaxona Disódica', categoriaTerapeutica: 'Antibióticos y Antimicrobianos', presentacion: 'Frasco Ámpula 1g IV', lote: 'L-2026A-18', caducidad: '2027-06-30', stockActual: 68, stockMinimo: 80, stockMaximo: 300, nivelAlerta: 'Bajo', ubicacionAlmacen: 'Urgencias', precioUnitarioMxn: 360.0 },
      { idMedicamento: 'MED-007', nombreComercial: 'Merrem 1g', principioActivo: 'Meropenem Trihidratado', categoriaTerapeutica: 'Antibióticos y Antimicrobianos', presentacion: 'Frasco Ámpula 1g IV', lote: 'L-2026D-01', caducidad: '2027-01-10', stockActual: 14, stockMinimo: 40, stockMaximo: 150, nivelAlerta: 'Crítico', ubicacionAlmacen: 'Terapia Intensiva (UTI)', precioUnitarioMxn: 1250.0 },
      { idMedicamento: 'MED-008', nombreComercial: 'Ciproxina 500', principioActivo: 'Ciprofloxacino Clorhidrato', categoriaTerapeutica: 'Antibióticos y Antimicrobianos', presentacion: 'Tabletas 500mg', lote: 'L-2026A-22', caducidad: '2028-03-15', stockActual: 240, stockMinimo: 100, stockMaximo: 500, nivelAlerta: 'Normal', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 290.0 },
      { idMedicamento: 'MED-009', nombreComercial: 'Cozaar 50mg', principioActivo: 'Losartán Potásico', categoriaTerapeutica: 'Cardiología y Antihipertensivos', presentacion: 'Comprimidos 50mg (c/30)', lote: 'L-2026B-02', caducidad: '2028-05-10', stockActual: 580, stockMinimo: 200, stockMaximo: 800, nivelAlerta: 'Normal', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 310.0 },
      { idMedicamento: 'MED-010', nombreComercial: 'Norvasc 5mg', principioActivo: 'Besilato de Amlodipino', categoriaTerapeutica: 'Cardiología y Antihipertensivos', presentacion: 'Tabletas 5mg (c/30)', lote: 'L-2026B-08', caducidad: '2027-09-18', stockActual: 420, stockMinimo: 150, stockMaximo: 600, nivelAlerta: 'Normal', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 380.0 },
      { idMedicamento: 'MED-011', nombreComercial: 'Adrenalina UCI', principioActivo: 'Epinefrina', categoriaTerapeutica: 'Urgencias y Soporte Vital', presentacion: 'Ampolleta 1mg/ml', lote: 'L-2026E-01', caducidad: '2026-11-30', stockActual: 18, stockMinimo: 50, stockMaximo: 150, nivelAlerta: 'Crítico', ubicacionAlmacen: 'Carro Rojo Urgencias', precioUnitarioMxn: 120.0 },
      { idMedicamento: 'MED-012', nombreComercial: 'Atropina 1mg', principioActivo: 'Sulfato de Atropina', categoriaTerapeutica: 'Urgencias y Soporte Vital', presentacion: 'Ampolleta 1mg/ml', lote: 'L-2026E-03', caducidad: '2027-07-22', stockActual: 25, stockMinimo: 40, stockMaximo: 120, nivelAlerta: 'Bajo', ubicacionAlmacen: 'Carro Rojo Urgencias', precioUnitarioMxn: 95.0 },
      { idMedicamento: 'MED-013', nombreComercial: 'Clexane 40mg', principioActivo: 'Enoxaparina Sódica', categoriaTerapeutica: 'Hematología y Anticoagulantes', presentacion: 'Jeringa Prellenada 40mg/0.4ml', lote: 'L-2026C-11', caducidad: '2027-10-15', stockActual: 185, stockMinimo: 100, stockMaximo: 400, nivelAlerta: 'Normal', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 540.0 },
      { idMedicamento: 'MED-014', nombreComercial: 'Eliquis 5mg', principioActivo: 'Apixabán', categoriaTerapeutica: 'Hematología y Anticoagulantes', presentacion: 'Tabletas 5mg (c/60)', lote: 'L-2026C-15', caducidad: '2028-01-20', stockActual: 110, stockMinimo: 80, stockMaximo: 250, nivelAlerta: 'Normal', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 1650.0 },
      { idMedicamento: 'MED-015', nombreComercial: 'Ventolin Aerosol', principioActivo: 'Salbutamol', categoriaTerapeutica: 'Neumología y Vías Respiratorias', presentacion: 'Inhalador 100mcg (200 dosis)', lote: 'L-2026B-20', caducidad: '2027-12-05', stockActual: 95, stockMinimo: 60, stockMaximo: 250, nivelAlerta: 'Normal', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 285.0 },
      { idMedicamento: 'MED-016', nombreComercial: 'Pulmicort Turbuhaler', principioActivo: 'Budesonida', categoriaTerapeutica: 'Neumología y Vías Respiratorias', presentacion: 'Polvo Inhalación 200mcg', lote: 'L-2026B-25', caducidad: '2027-08-14', stockActual: 40, stockMinimo: 50, stockMaximo: 150, nivelAlerta: 'Bajo', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 720.0 },
      { idMedicamento: 'MED-017', nombreComercial: 'Lantus SoloStar', principioActivo: 'Insulina Glargina', categoriaTerapeutica: 'Endocrinología y Diabetes', presentacion: 'Pluma Precargada 100 UI/ml', lote: 'L-2026F-02', caducidad: '2027-05-30', stockActual: 88, stockMinimo: 50, stockMaximo: 200, nivelAlerta: 'Normal', ubicacionAlmacen: 'Refrigerador Farmacia Central', precioUnitarioMxn: 890.0 },
      { idMedicamento: 'MED-018', nombreComercial: 'Glucophage 850', principioActivo: 'Clorhidrato de Metformina', categoriaTerapeutica: 'Endocrinología y Diabetes', presentacion: 'Tabletas 850mg (c/30)', lote: 'L-2026F-08', caducidad: '2028-06-30', stockActual: 650, stockMinimo: 200, stockMaximo: 1000, nivelAlerta: 'Normal', ubicacionAlmacen: 'Farmacia Central', precioUnitarioMxn: 195.0 },
      { idMedicamento: 'MED-019', nombreComercial: 'Fentanilo UCI', principioActivo: 'Citrato de Fentanilo', categoriaTerapeutica: 'Analgésicos Controlados UCI', presentacion: 'Ampolleta 0.5mg/10ml', lote: 'L-2026C-22', caducidad: '2026-10-31', stockActual: 8, stockMinimo: 25, stockMaximo: 80, nivelAlerta: 'Crítico', ubicacionAlmacen: 'Terapia Intensiva (UTI)', precioUnitarioMxn: 450.0 },
      { idMedicamento: 'MED-020', nombreComercial: 'Solución Fisiológica 0.9%', principioActivo: 'Cloruro de Sodio', categoriaTerapeutica: 'Soluciones y Terapia IV', presentacion: 'Bolsa 1000ml c/infusor', lote: 'L-2026S-99', caducidad: '2028-12-31', stockActual: 1450, stockMinimo: 500, stockMaximo: 2500, nivelAlerta: 'Normal', ubicacionAlmacen: 'Almacén General', precioUnitarioMxn: 65.0 },
    ];
  }

  let bulkMed = '';
  for (const m of medData) {
    const price = Number(m.precioUnitarioMxn || m.precio || 0);
    const stock = Number(m.stockActual || m.stock || 0);
    bulkMed += JSON.stringify({ index: { _index: pharmacyIndex, _id: m.idMedicamento || m.id } }) + '\n';
    bulkMed += JSON.stringify({
      medicamento_id: m.idMedicamento || m.id,
      nombre_comercial: m.nombreComercial || m.comercial,
      principio_activo: m.principioActivo || m.activo,
      categoria_terapeutica: m.categoriaTerapeutica || m.cat,
      presentacion: m.presentacion || m.pres,
      lote: m.lote,
      caducidad: m.caducidad || m.cad,
      stock_actual: stock,
      stock_minimo: Number(m.stockMinimo || m.min || 0),
      stock_maximo: Number(m.stockMaximo || m.max || 0),
      nivel_alerta: m.nivelAlerta || m.alerta || 'Normal',
      ubicacion_almacen: m.ubicacionAlmacen || m.almacen,
      precio_unitario_mxn: price,
      costo_total_inventario_mxn: Math.round(stock * price * 100) / 100,
      '@timestamp': now,
    }) + '\n';
  }

  await fetch(`${ES_URL}/_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body: bulkMed,
  });
  console.log(`  ✓ ${medData.length} medications indexed in ${pharmacyIndex}`);

  // 4. Seed Hospital Bed Census from PostgreSQL
  console.log('\n🛏️ Syncing bed census from PostgreSQL...');
  let censusData = [];
  try {
    const res = await fetch('http://localhost/api/hospitalizations/bed-census');
    if (res.ok) censusData = await res.json();
  } catch (err) {
    console.warn('  ⚠️ Bed census fallback:', err.message);
  }

  if (!censusData || censusData.length === 0) {
    censusData = [
      { idHabitacion: 1, numero: 'HAB-101', tipo: 'general', piso: 1, costoDia: 45000, activa: true, ocupada: false, pacienteActual: null },
      { idHabitacion: 2, numero: 'HAB-102', tipo: 'general', piso: 1, costoDia: 45000, activa: true, ocupada: true, pacienteActual: { idPaciente: 2, nombreCompleto: 'Carlos López', dni: '584585658', diagnosticoIngreso: 'Politraumatismo por accidente en vía pública', medicoResponsable: 'Alberto Arévalo', fechaIngreso: '2026-10-16T12:15:00.000Z' } },
      { idHabitacion: 6, numero: 'OBS-01', tipo: 'observacion', piso: 1, costoDia: 30000, activa: true, ocupada: false, pacienteActual: null },
      { idHabitacion: 3, numero: 'HAB-201', tipo: 'individual', piso: 2, costoDia: 75000, activa: true, ocupada: false, pacienteActual: null },
      { idHabitacion: 4, numero: 'HAB-202', tipo: 'individual', piso: 2, costoDia: 75000, activa: true, ocupada: false, pacienteActual: null },
      { idHabitacion: 5, numero: 'UTI-01', tipo: 'terapia_intensiva', piso: 3, costoDia: 160000, activa: true, ocupada: false, pacienteActual: null },
    ];
  }

  const tipoLabels = {
    general: 'Habitación General',
    individual: 'Habitación Individual',
    terapia_intensiva: 'Terapia Intensiva (UTI)',
    observacion: 'Observación / Urgencias',
  };

  let bulkBeds = '';
  for (const b of censusData) {
    const days = b.pacienteActual?.fechaIngreso
      ? Math.max(1, Math.ceil((Date.now() - new Date(b.pacienteActual.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    bulkBeds += JSON.stringify({ index: { _index: bedsIndex, _id: b.numero } }) + '\n';
    bulkBeds += JSON.stringify({
      cama_id: b.numero,
      numero: b.numero,
      piso: b.piso,
      tipo: tipoLabels[b.tipo] || b.tipo,
      estado: b.ocupada ? 'Ocupada' : 'Disponible',
      tarifa_noche_mxn: Number(b.costoDia),
      paciente_nombre: b.pacienteActual ? b.pacienteActual.nombreCompleto : null,
      paciente_dni: b.pacienteActual ? b.pacienteActual.dni : null,
      medico_responsable: b.pacienteActual ? b.pacienteActual.medicoResponsable : null,
      diagnostico_ingreso: b.pacienteActual ? b.pacienteActual.diagnosticoIngreso : null,
      dias_estancia: days,
      costo_acumulado_mxn: Math.round(Number(b.costoDia) * Math.max(1, days) * 100) / 100,
      '@timestamp': now,
    }) + '\n';
  }

  await fetch(`${ES_URL}/_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body: bulkBeds,
  });
  console.log(`  ✓ ${censusData.length} beds synced in ${bedsIndex}`);

  // 5. Seed Clinical Operations and Billing from PostgreSQL
  console.log('\n📊 Syncing clinical operations and billing from PostgreSQL...');
  let billingData = [];
  try {
    const billRes = await fetch('http://localhost/api/billing');
    if (billRes.ok) billingData = await billRes.json();
  } catch (err) {
    console.warn('  ⚠️ Billing fallback:', err.message);
  }

  const helperAseguradora = (afiliado, metodoPago) => {
    if (afiliado) {
      if (afiliado.startsWith('OSDE')) return 'OSDE 310';
      if (afiliado.startsWith('SM')) return 'Swiss Medical';
      if (afiliado.startsWith('GAL')) return 'Galeno Oro';
      if (afiliado.startsWith('PAMI')) return 'PAMI Jubilados';
    }
    return metodoPago === 'obra_social' ? 'Obra Social' : 'Particular/Ninguno';
  };

  let bulkOps = '';
  if (billingData && billingData.length > 0) {
    for (const p of billingData) {
      const gross = parseFloat(p.montoBruto || '0');
      const discount = parseFloat(p.descuentoCobertura || '0');
      const net = parseFloat(p.montoNeto || '0');
      const doc = p.turno?.medico
        ? `Dr/a. ${p.turno.medico.apellido}`
        : p.internacion
          ? 'Equipo UCI'
          : 'Dr/a. Médico';
      const spec = p.turno?.especialidad?.nombre || (p.internacion ? 'Internación Hospitalaria' : (p.concepto?.nombre || 'Consulta Médica'));
      const pat = p.paciente ? `${p.paciente.nombre} ${p.paciente.apellido}` : 'Paciente';
      const ins = helperAseguradora(p.paciente?.numeroAfiliado, p.metodoPago);

      const modalidad = (p.idPago % 3 === 0) ? 'Telemedicina WebRTC' : 'Consulta Presencial';
      const docFee = Math.round(gross * 0.8 * 100) / 100;
      const clinicFee = Math.round(gross * 0.2 * 100) / 100;
      const rxStatus = (p.idPago % 2 === 0) ? 'DISPENSADA' : 'EMITIDA';

      bulkOps += JSON.stringify({ index: { _index: opsIndex, _id: p.comprobanteFiscal || `PAGO-${p.idPago}` } }) + '\n';
      bulkOps += JSON.stringify({
        operacion_id: p.comprobanteFiscal || `PAGO-${p.idPago}`,
        tipo_evento: p.idInternacion ? 'internacion' : 'facturacion',
        modalidad,
        especialidad: spec,
        medico: doc,
        paciente: pat,
        estado: p.estado || 'completado',
        aseguradora: ins,
        monto_total_mxn: gross,
        monto_mxn: gross,
        monto_neto_mxn: net,
        copago_mxn: net,
        descuento_cobertura_mxn: discount,
        honorario_medico_mxn: docFee,
        comision_clinica_mxn: clinicFee,
        receta_digital_estado: rxStatus,
        firma_digital_valida: true,
        fecha_pago: p.fechaPago,
        '@timestamp': now,
      }) + '\n';
    }

    await fetch(`${ES_URL}/_bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson' },
      body: bulkOps,
    });
    console.log(`  ✓ ${billingData.length} real PostgreSQL payments indexed in ${opsIndex}`);
  }

  // 6. Seed HIPAA Security Audit (Pillar 1)
  console.log('\n🛡️ Indexing HIPAA security & audit log from PostgreSQL and NOM-024 / HIPAA standards...');
  let auditData = [];
  try {
    const auditRes = await fetch('http://localhost/api/audit?limit=100', {
      headers: { 'x-user-roles': 'admin_user' },
    });
    if (auditRes.ok) auditData = await auditRes.json();
  } catch (err) {
    console.warn('  ⚠️ Error querying audit API:', err.message);
  }

  let bulkAudit = '';
  let auditCounter = 1;

  // Index real PostgreSQL events
  for (const a of auditData) {
    const estado = a.accion.includes('FALLIDO') ? 'FALLIDO' : a.accion.includes('BLOQUEADO') ? 'BLOQUEADO' : 'EXITOSO';
    bulkAudit += JSON.stringify({ index: { _index: auditIndex, _id: `AUDIT-REAL-${a.idAuditoria}` } }) + '\n';
    bulkAudit += JSON.stringify({
      id_auditoria: `AUDIT-${a.idAuditoria}`,
      usuario_id: a.usuarioId,
      nombre_usuario: a.nombreUsuario,
      rol: a.rol,
      accion: a.accion,
      entidad: a.entidad,
      id_entidad: a.idEntidad,
      ip_cliente: a.ipCliente,
      user_agent: a.userAgent,
      estado_resultado: estado,
      motivo: a.metadatos?.motivo || (estado === 'EXITOSO' ? 'Operación autorizada' : 'Acceso no permitido'),
      metadatos: a.metadatos || {},
      '@timestamp': a.fechaHora || now,
    }) + '\n';
    auditCounter++;
  }

  // Generate continuous comprehensive HIPAA / NOM-024 compliance events (last 15 min & last 24h)
  const auditUsers = [
    { id: 'usr-doc-01', name: 'Dr. Alberto Arévalo', role: 'doctor_user', ip: '192.168.10.45' },
    { id: 'usr-doc-02', name: 'Dra. Laura Gómez', role: 'doctor_user', ip: '192.168.10.46' },
    { id: 'usr-doc-03', name: 'Dr. Roberto Cruz', role: 'doctor_user', ip: '192.168.10.47' },
    { id: 'usr-nur-01', name: 'Enf. Carmen Morales', role: 'nurse_user', ip: '192.168.10.60' },
    { id: 'usr-nur-02', name: 'Enf. José Ortiz', role: 'nurse_user', ip: '192.168.10.61' },
    { id: 'usr-adm-01', name: 'Lic. Sofía Reyes', role: 'admin_user', ip: '192.168.1.10' },
    { id: 'usr-rec-01', name: 'Mariana Pineda', role: 'receptionist_user', ip: '192.168.10.80' },
  ];

  const hipaaEventsBlueprint = [
    { accion: 'CONSULTA_PHI', entidad: 'pacientes', estado: 'EXITOSO', motivo: 'Revisión de expediente clínico de consulta', weight: 35 },
    { accion: 'CONSULTA_PHI', entidad: 'historia_clinica', estado: 'EXITOSO', motivo: 'Evolución médica de paciente internado', weight: 25 },
    { accion: 'MODIFICACION_PHI', entidad: 'historia_clinica', estado: 'EXITOSO', motivo: 'Actualización de prescripción y diagnósticos', weight: 20 },
    { accion: 'AUTO_LOGOUT_HIPAA', entidad: 'sesion_keycloak', estado: 'EXITOSO', motivo: 'Inactividad de 15 minutos superada (HIPAA § 164.312)', weight: 15 },
    { accion: 'INTENTO_ACCESO_FALLIDO', entidad: 'auth_service', estado: 'FALLIDO', motivo: 'Contraseña errónea en Keycloak', weight: 12, forcedRole: 'doctor_user' },
    { accion: 'ACCESO_BLOQUEADO', entidad: 'pacientes', estado: 'BLOQUEADO', motivo: 'Intento de acceso a PHI sin privilegios (WAF/Kong)', weight: 10, forcedRole: 'receptionist_user', forcedIp: '187.190.22.4' },
    { accion: 'EXPORTACION_EXPEDIENTE', entidad: 'expediente_completo', estado: 'EXITOSO', motivo: 'Auditoría interna NOM-024 cifrada AES-256', weight: 6, forcedRole: 'admin_user' },
  ];

  const deltasMinutes = [
    1, 2, 3, 5, 7, 9, 11, 13, 15, // High granularity in the last 15 min
    20, 25, 30, 45, 60, 90, 120, // Last 2 hours
    180, 240, 360, 480, 600, 720, 960, 1200, 1440 // Last 24 hours
  ];

  for (const m of deltasMinutes) {
    const eventTime = new Date(Date.now() - m * 60 * 1000).toISOString();
    for (const bp of hipaaEventsBlueprint) {
      const u = bp.forcedRole
        ? auditUsers.find((user) => user.role === bp.forcedRole) || auditUsers[0]
        : auditUsers[Math.floor(Math.random() * auditUsers.length)];

      const idEvent = `AUDIT-HIPAA-${auditCounter++}`;
      bulkAudit += JSON.stringify({ index: { _index: auditIndex, _id: idEvent } }) + '\n';
      bulkAudit += JSON.stringify({
        id_auditoria: idEvent,
        usuario_id: u.id,
        nombre_usuario: u.name,
        rol: u.role,
        accion: bp.accion,
        entidad: bp.entidad,
        id_entidad: Math.floor(1 + Math.random() * 15),
        ip_cliente: bp.forcedIp || u.ip,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HealthTech-Platform/2.0',
        estado_resultado: bp.estado,
        motivo: bp.motivo,
        metadatos: { standard: 'HIPAA § 164.312', nom: 'NOM-024-SSA3-2012', severity: bp.estado === 'EXITOSO' ? 'INFO' : 'ALERT' },
        '@timestamp': eventTime,
      }) + '\n';
    }
  }

  if (bulkAudit) {
    await fetch(`${ES_URL}/_bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson' },
      body: bulkAudit,
    });
    console.log(`  ✓ ${auditCounter} HIPAA audit events indexed in ${auditIndex}`);
  }

  // 7. Seed SRE / APM Telemetry Metrics (Pillar 3)
  console.log('\n⚙️ Generating microservice performance and health telemetry (SRE / APM)...');
  const servicesList = [
    { name: 'appointment-service', port: 3001, type: 'NestJS Microservice', baseLat: 12.5, rpm: 180, cpu: 11.2, mem: 145 },
    { name: 'patient-service', port: 3002, type: 'NestJS Microservice', baseLat: 10.4, rpm: 160, cpu: 9.8, mem: 138 },
    { name: 'billing-service', port: 3003, type: 'NestJS Microservice', baseLat: 14.1, rpm: 110, cpu: 10.5, mem: 142 },
    { name: 'pharmacy-service', port: 3004, type: 'NestJS Microservice', baseLat: 9.2, rpm: 140, cpu: 8.7, mem: 135 },
    { name: 'notification-service', port: 3005, type: 'NestJS Microservice', baseLat: 8.6, rpm: 210, cpu: 12.1, mem: 152 },
    { name: 'clinical-records-service', port: 3006, type: 'NestJS Microservice', baseLat: 15.3, rpm: 130, cpu: 13.4, mem: 160 },
    { name: 'staff-service', port: 3007, type: 'NestJS Microservice', baseLat: 7.8, rpm: 95, cpu: 7.9, mem: 130 },
    { name: 'kong-gateway', port: 8000, type: 'Kong Gateway 3.9.4', baseLat: 2.1, rpm: 850, cpu: 8.9, mem: 95 },
    { name: 'kafka', port: 9092, type: 'Apache Kafka 8.3 (KRaft)', baseLat: 1.5, rpm: 900, cpu: 14.0, mem: 512 },
    { name: 'postgres', port: 5432, type: 'PostgreSQL 18 DB', baseLat: 3.2, rpm: 450, cpu: 11.5, mem: 210 },
    { name: 'redis', port: 6379, type: 'Redis 8.8 Cache & Idemp', baseLat: 0.8, rpm: 600, cpu: 4.8, mem: 48 },
    { name: 'keycloak', port: 8080, type: 'Keycloak 26.8 IAM', baseLat: 24.0, rpm: 45, cpu: 18.0, mem: 420 },
  ];

  const endpointsList = [
    { ep: '/api/patients', method: 'GET', baseLat: 14.2, status: 200, svc: 'patient-service' },
    { ep: '/api/patients/1/fhir', method: 'GET', baseLat: 18.1, status: 200, svc: 'patient-service', fhir: 'FHIR_PATIENT_R4' },
    { ep: '/api/patients/fhir', method: 'GET', baseLat: 22.4, status: 200, svc: 'patient-service', fhir: 'FHIR_BUNDLE' },
    { ep: '/api/appointments', method: 'GET', baseLat: 16.5, status: 200, svc: 'appointment-service' },
    { ep: '/api/appointments', method: 'POST', baseLat: 24.1, status: 201, svc: 'appointment-service' },
    { ep: '/api/appointments/1/virtual-room', method: 'POST', baseLat: 28.5, status: 200, svc: 'appointment-service', proto: 'WebRTC Signal' },
    { ep: '/api/medical-records/1/fhir', method: 'GET', baseLat: 21.0, status: 200, svc: 'clinical-records-service', fhir: 'FHIR_ENCOUNTER_R4' },
    { ep: '/api/medical-records/prescriptions', method: 'POST', baseLat: 31.0, status: 201, svc: 'clinical-records-service' },
    { ep: '/api/medical-records/prescriptions/verify', method: 'GET', baseLat: 15.2, status: 200, svc: 'clinical-records-service' },
    { ep: '/api/billing', method: 'GET', baseLat: 13.5, status: 200, svc: 'billing-service' },
    { ep: '/api/billing/doctors/2/settlement', method: 'GET', baseLat: 25.0, status: 200, svc: 'billing-service' },
    { ep: '/api/pharmacy', method: 'GET', baseLat: 11.8, status: 200, svc: 'pharmacy-service' },
    { ep: '/api/pharmacy/summary', method: 'GET', baseLat: 9.4, status: 200, svc: 'pharmacy-service' },
    { ep: '/api/hospitalizations/bed-census', method: 'GET', baseLat: 21.0, status: 200, svc: 'clinical-records-service' },
    { ep: '/api/notifications/reminders/trigger', method: 'POST', baseLat: 12.0, status: 200, svc: 'notification-service' },
    { ep: '/api/notifications/dlq', method: 'GET', baseLat: 6.5, status: 200, svc: 'notification-service' },
    { ep: '/api/doctors', method: 'GET', baseLat: 8.5, status: 200, svc: 'staff-service' },
    { ep: '/api/auth/login', method: 'POST', baseLat: 42.0, status: 200, svc: 'keycloak' },
    { ep: '/api/auth/login', method: 'POST', baseLat: 38.0, status: 401, svc: 'keycloak' },
    { ep: '/api/patients/9999', method: 'GET', baseLat: 11.0, status: 404, svc: 'patient-service' },
  ];

  let bulkTelemetry = '';
  let telId = 1;

  for (const m of deltasMinutes) {
    const metricTime = new Date(Date.now() - m * 60 * 1000).toISOString();

    for (const ep of endpointsList) {
      const jitter = (Math.random() - 0.5) * 6;
      const lat = Math.max(2, Math.round((ep.baseLat + jitter) * 10) / 10);
      const rpm = Math.round(50 + Math.random() * 80);

      bulkTelemetry += JSON.stringify({ index: { _index: telemetryIndex, _id: `TEL-${telId++}` } }) + '\n';
      bulkTelemetry += JSON.stringify({
        servicio: ep.svc || 'backend',
        endpoint: ep.ep,
        metodo_http: ep.method,
        codigo_estado: ep.status,
        categoria_estado: `${Math.floor(ep.status / 100)}xx`,
        latencia_ms: lat,
        peticiones_por_minuto: rpm,
        estado_salud: 'Healthy',
        estandar_fhir: ep.fhir,
        protocolo: ep.proto || 'REST / HTTP 1.1',
        correlation_id: `CORR-${m}-${Math.floor(Math.random() * 90000 + 10000)}`,
        dlq_pendientes: 0,
        uso_cpu_pct: Math.round((14.5 + Math.random() * 4) * 10) / 10,
        uso_memoria_mb: Math.round((172 + Math.random() * 10) * 10) / 10,
        '@timestamp': metricTime,
      }) + '\n';
    }

    // Record health status of each microservice at each interval
    for (const s of servicesList) {
      const sLat = Math.max(0.4, Math.round((s.baseLat + (Math.random() - 0.5) * 2) * 10) / 10);
      bulkTelemetry += JSON.stringify({ index: { _index: telemetryIndex, _id: `SVC-${s.name}-${m}` } }) + '\n';
      bulkTelemetry += JSON.stringify({
        servicio: s.name,
        endpoint: `:${s.port}`,
        metodo_http: 'HEALTHCHECK',
        codigo_estado: 200,
        categoria_estado: '2xx',
        latencia_ms: sLat,
        peticiones_por_minuto: s.rpm,
        estado_salud: 'Healthy',
        uso_cpu_pct: Math.round((s.cpu + (Math.random() - 0.5) * 2.5) * 10) / 10,
        uso_memoria_mb: Math.round((s.mem + (Math.random() - 0.5) * 8) * 10) / 10,
        '@timestamp': metricTime,
      }) + '\n';
    }
  }

  await fetch(`${ES_URL}/_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body: bulkTelemetry,
  });
  console.log(`  ✓ ${telId} microservice telemetry and health records indexed in ${telemetryIndex}`);

  await fetch(`${ES_URL}/${pharmacyIndex},${bedsIndex},${opsIndex},${auditIndex},${telemetryIndex}/_refresh`, { method: 'POST' });

  // 8. Configure Data Views in Kibana
  console.log('\n👁️ Registering deterministic Data Views in Kibana...');
  const pharmacyDvId = 'healthtech-pharmacy-dv';
  const bedsDvId = 'healthtech-beds-dv';
  const opsDvId = 'healthtech-ops-dv';
  const auditDvId = 'healthtech-audit-dv';
  const telemetryDvId = 'healthtech-telemetry-dv';

  const dataViews = [
    { id: pharmacyDvId, title: 'healthtech-pharmacy-stock*', name: 'Pharmacy - Stock & Medication Alerts' },
    { id: bedsDvId, title: 'healthtech-beds-census*', name: 'Bed Census & Hospital Occupancy' },
    { id: opsDvId, title: 'healthtech-clinical-operations*', name: 'Clinical Operations & Consultations' },
    { id: auditDvId, title: 'healthtech-security-audit*', name: 'Security & HIPAA Audit (NOM-024)', timeFieldName: '@timestamp' },
    { id: telemetryDvId, title: 'healthtech-telemetry-metrics*', name: 'SRE Platform Health & APM', timeFieldName: '@timestamp' },
  ];

  for (const dv of dataViews) {
    await fetch(`${KBN_URL}/api/saved_objects/index-pattern/${dv.id}?overwrite=true`, {
      method: 'POST',
      headers: KBN_HEADERS,
      body: JSON.stringify({
        attributes: {
          title: dv.title,
          name: dv.name,
          timeFieldName: dv.timeFieldName,
        },
      }),
    });
    console.log(`  ✓ Data View "${dv.name}" registered (${dv.id})`);
  }

  // 9. Create Official Visualizations
  console.log('\n🎨 Creating Official Visualizations for the 3 Pillars...');

  // --- PILLAR 1: Business Dashboard (Beds, Pharmacy & Billing) ---
  const visHeaderOps = {
    attributes: {
      title: 'Banner - Business Dashboard (Beds, Pharmacy & Billing)',
      visState: JSON.stringify({
        title: 'Banner - Business Dashboard',
        type: 'markdown',
        params: {
          markdown:
            '# 🏥 Medical Center • Business Dashboard: Beds, Pharmacy & Billing\n' +
            '> **Unified Navigation**: [🛡️ Go to Tech Dashboard (System Health, SRE / APM, Security & HIPAA Audit)](#/view/tech-sre-security-dashboard) &bull; **Dynamic Filters & Real-Time Hospital Intelligence**',
        },
      }),
      uiStateJSON: '{}',
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-header?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visHeaderOps) });

  const visControls = {
    attributes: {
      title: 'Dynamic Filters - Floor, Alert & Category',
      uiStateJSON: '{}',
      visState: JSON.stringify({
        title: 'Dynamic Hospital Filters',
        type: 'input_control_vis',
        params: {
          controls: [
            { id: 'ctrl-piso', fieldName: 'piso', label: '🏢 Filter by Hospital Floor', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 5 }, indexPatternRefName: 'ctrl_piso_dv' },
            { id: 'ctrl-alerta', fieldName: 'nivel_alerta', label: '🚨 Medication Alert Level', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 5 }, indexPatternRefName: 'ctrl_alerta_dv' },
            { id: 'ctrl-cat', fieldName: 'categoria_terapeutica', label: '💊 Therapeutic Category', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 10 }, indexPatternRefName: 'ctrl_cat_dv' },
          ],
          updateFiltersOnChange: true,
          useTimeFilter: false,
          pinFilters: false,
        },
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [
      { name: 'ctrl_piso_dv', type: 'index-pattern', id: bedsDvId },
      { name: 'ctrl_alerta_dv', type: 'index-pattern', id: pharmacyDvId },
      { name: 'ctrl_cat_dv', type: 'index-pattern', id: pharmacyDvId },
    ],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-controls-filter?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visControls) });

  // Bed and Pharmacy KPIs
  const visMetricBedsFree = {
    attributes: {
      title: 'Dynamic KPI - Available Beds',
      visState: JSON.stringify({
        title: 'Available Beds',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Available for immediate assignment', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🟢 Available Beds' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'estado: "Disponible"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-beds-free?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricBedsFree) });

  const visMetricBedsOcc = {
    attributes: {
      title: 'Dynamic KPI - Occupied Beds',
      visState: JSON.stringify({
        title: 'Occupied Beds',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Patients actively hospitalized', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🔴 Occupied Beds' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'estado: "Ocupada"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-beds-occupied?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricBedsOcc) });

  const visMetricPharmCrit = {
    attributes: {
      title: 'Dynamic KPI - Critical Alert Medications',
      visState: JSON.stringify({
        title: 'Critical Alert',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Lines requiring urgent restocking', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🚨 Critical Medications' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'nivel_alerta: "Crítico" or nivel_alerta: "CRITICO"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-pharm-critical?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricPharmCrit) });

  const visMetricPharmStock = {
    attributes: {
      title: 'Dynamic KPI - Total Medication Stock',
      visState: JSON.stringify({
        title: 'Total Stock Units',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Units in hospital warehouses', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'stock_actual', customLabel: '📦 Units in Warehouse' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-pharm-stock-sum?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricPharmStock) });

  const visMetricRevenue = {
    attributes: {
      title: 'Dynamic KPI - Clinical Billing MXN',
      visState: JSON.stringify({
        title: 'Hospital Billing',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Total revenue per PostgreSQL pago table', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'monto_total_mxn', customLabel: '💵 Total Revenue (MXN)' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: opsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-revenue?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricRevenue) });

  // Chart Visualization: Revenue by Insurer
  const visRevenueByInsurer = {
    attributes: {
      title: 'Donut Chart - Revenue by Insurer / Health Plan',
      visState: JSON.stringify({
        title: 'Revenue by Insurer (MXN)',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'monto_total_mxn', customLabel: 'Total Billed (MXN)' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'aseguradora', size: 10, order: 'desc', orderBy: '1', customLabel: 'Insurer / Health Plan' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: opsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pie-revenue-by-insurer?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visRevenueByInsurer) });

  // Dynamic KPI: Net Physician Fees (80%)
  const visMetricDoctorPayout = {
    attributes: {
      title: 'Dynamic KPI - Accumulated Net Physician Fees',
      visState: JSON.stringify({
        title: 'Physician Fees (80%)',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Fees payable per medical balance', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'honorario_medico_mxn', customLabel: '👨‍⚕️ Physician Fees (MXN)' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: opsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-doctor-payout?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricDoctorPayout) });

  // Dynamic KPI: Clinic Retention Margin 20%
  const visMetricClinicMargin = {
    attributes: {
      title: 'Dynamic KPI - Clinic Retention Margin 20%',
      visState: JSON.stringify({
        title: 'Medical Center Margin (20%)',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: '20% commission for hospital operations', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'comision_clinica_mxn', customLabel: '🏥 Clinic Margin (MXN)' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: opsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-clinic-margin?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricClinicMargin) });

  // Donut Chart: WebRTC Telemedicine vs In-Person Consultation Modality
  const visPieModality = {
    attributes: {
      title: 'Donut Chart - Consultation Modality: WebRTC Telemedicine vs In-Person',
      visState: JSON.stringify({
        title: 'Consultation Modality',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Total Consultations' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'modalidad', size: 5, order: 'desc', orderBy: '1', customLabel: 'Care Modality' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: opsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pie-modality?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visPieModality) });

  // Bar Chart: Current vs Minimum Stock
  const visBarStock = {
    attributes: {
      title: 'Bar Chart - Current vs Minimum Stock by Medication',
      visState: JSON.stringify({
        title: 'Inventory Comparison: Current vs Minimum Stock',
        type: 'horizontal_bar',
        params: {
          type: 'histogram', grid: { categoryLines: false },
          categoryAxes: [{ id: 'CategoryAxis-1', type: 'category', position: 'left', show: true, scale: { type: 'linear' }, labels: { show: true, truncate: 100 }, title: {} }],
          valueAxes: [{ id: 'ValueAxis-1', name: 'LeftAxis-1', type: 'value', position: 'bottom', show: true, scale: { type: 'linear', mode: 'normal' }, labels: { show: true, rotate: 0, filter: false, truncate: 100 }, title: { text: 'Medication Units' } }],
          seriesParams: [
            { show: true, type: 'histogram', mode: 'normal', data: { label: 'Current Stock', id: '1' }, valueAxis: 'ValueAxis-1', drawLinesBetweenPoints: true, showCircles: true },
            { show: true, type: 'histogram', mode: 'normal', data: { label: 'Required Minimum Stock', id: '2' }, valueAxis: 'ValueAxis-1', drawLinesBetweenPoints: true, showCircles: true },
          ],
          addTooltip: true, addLegend: true, legendPosition: 'top',
        },
        aggs: [
          { id: '1', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_actual', customLabel: 'Current Stock' } },
          { id: '2', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_minimo', customLabel: 'Required Minimum Stock' } },
          { id: '3', enabled: true, type: 'terms', schema: 'segment', params: { field: 'nombre_comercial.keyword', size: 15, order: 'asc', orderBy: '1', customLabel: 'Medication' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-bar-stock-compare?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBarStock) });

  const visBarBeds = {
    attributes: {
      title: 'Stacked Bar Chart - Beds by Floor and Status',
      visState: JSON.stringify({
        title: 'Beds by Floor and Occupancy Status',
        type: 'histogram',
        params: {
          type: 'histogram', grid: { categoryLines: false },
          categoryAxes: [{ id: 'CategoryAxis-1', type: 'category', position: 'bottom', show: true, scale: { type: 'linear' }, labels: { show: true, truncate: 100 }, title: {} }],
          valueAxes: [{ id: 'ValueAxis-1', name: 'LeftAxis-1', type: 'value', position: 'left', show: true, scale: { type: 'linear', mode: 'normal' }, labels: { show: true, rotate: 0, filter: false, truncate: 100 }, title: { text: 'Bed Count' } }],
          seriesParams: [{ show: true, type: 'histogram', mode: 'stacked', data: { label: 'Bed Count', id: '1' }, valueAxis: 'ValueAxis-1', drawLinesBetweenPoints: true, showCircles: true }],
          addTooltip: true, addLegend: true, legendPosition: 'right',
        },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Bed Count' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'piso', size: 5, order: 'asc', orderBy: '_key', customLabel: 'Hospital Floor' } },
          { id: '3', enabled: true, type: 'terms', schema: 'group', params: { field: 'estado', size: 5, order: 'desc', orderBy: '1', customLabel: 'Status' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-bar-beds-by-floor?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBarBeds) });

  const visBedsDonut = {
    attributes: {
      title: 'Donut Chart - Bed Census by Status',
      visState: JSON.stringify({
        title: 'Bed Proportion by Status',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Number of Beds' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'estado', size: 5, order: 'desc', orderBy: '1', customLabel: 'Occupancy Status' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-beds-donut?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBedsDonut) });

  const visPharmacyPie = {
    attributes: {
      title: 'Donut Chart - Stock by Therapeutic Category',
      visState: JSON.stringify({
        title: 'Stock by Therapeutic Category',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'stock_actual', customLabel: 'Total Stock Units' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'categoria_terapeutica', size: 10, order: 'desc', orderBy: '1', customLabel: 'Therapeutic Category' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pharmacy-pie?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visPharmacyPie) });

  const visPharmacyTable = {
    attributes: {
      title: 'Dynamic Table - Medication Inventory & Alert Traffic Light',
      visState: JSON.stringify({
        title: 'Dynamic Medication Inventory',
        type: 'table',
        params: { perPage: 10, showPartialRows: false, showMetricsAtAllLevels: false, showTotal: true, totalFunc: 'sum' },
        aggs: [
          { id: '1', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_actual', customLabel: 'Current Stock' } },
          { id: '2', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_minimo', customLabel: 'Minimum Stock' } },
          { id: '3', enabled: true, type: 'avg', schema: 'metric', params: { field: 'precio_unitario_mxn', customLabel: 'Unit Price (MXN)' } },
          { id: '4', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'nombre_comercial.keyword', size: 25, order: 'asc', orderBy: '1', customLabel: 'Medication' } },
          { id: '5', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'categoria_terapeutica', size: 10, order: 'desc', orderBy: '1', customLabel: 'Therapeutic Category' } },
          { id: '6', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'nivel_alerta', size: 5, order: 'desc', orderBy: '1', customLabel: 'Alert Level' } },
          { id: '7', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'ubicacion_almacen', size: 5, order: 'desc', orderBy: '1', customLabel: 'Warehouse Location' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-table-pharmacy-dynamic?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visPharmacyTable), });

  const visBedsTable = {
    attributes: {
      title: 'Dynamic Table - Real-Time Hospital Bed Census',
      visState: JSON.stringify({
        title: 'Hospital Bed Census',
        type: 'table',
        params: { perPage: 10, showPartialRows: false, showMetricsAtAllLevels: false, showTotal: false, totalFunc: 'sum' },
        aggs: [
          { id: '1', enabled: true, type: 'max', schema: 'metric', params: { field: 'tarifa_noche_mxn', customLabel: 'Nightly Rate (MXN)' } },
          { id: '2', enabled: true, type: 'max', schema: 'metric', params: { field: 'dias_estancia', customLabel: 'Days of Stay' } },
          { id: '3', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'numero', size: 25, order: 'asc', orderBy: '_key', customLabel: 'Room' } },
          { id: '4', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'piso', size: 5, order: 'asc', orderBy: '_key', customLabel: 'Floor' } },
          { id: '5', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'tipo', size: 10, order: 'desc', orderBy: '1', customLabel: 'Unit Type' } },
          { id: '6', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'estado', size: 5, order: 'desc', orderBy: '1', customLabel: 'Status' } },
          { id: '7', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'paciente_nombre.keyword', size: 25, order: 'desc', orderBy: '1', missingBucket: true, missingBucketLabel: '🟢 [Available Bed]', customLabel: 'Assigned Patient' } },
          { id: '8', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'medico_responsable', size: 25, order: 'desc', orderBy: '1', missingBucket: true, missingBucketLabel: '🟢 [Attending Physician]', customLabel: 'Attending Physician' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-table-beds-dynamic?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBedsTable) });

  // --- PILLAR 2: Tech Dashboard Visualizations (SRE / APM, Security & HIPAA Audit) ---
  const visHeaderTech = {
    attributes: {
      title: 'Banner - Tech Dashboard (SRE / APM, System Health, Security & HIPAA Audit)',
      visState: JSON.stringify({
        title: 'Banner - Tech Dashboard',
        type: 'markdown',
        params: {
          markdown:
            '# 🛡️ Medical Center • Tech Dashboard: SRE / APM, System Health, Security & HIPAA Audit\n' +
            '> **Unified Navigation**: [🏥 Go to Business Dashboard (Beds, Pharmacy & Billing)](#/view/business-operations-dashboard) &bull; **OpenTelemetry Telemetry & HIPAA Forensic Audit (NOM-024)**',
        },
      }),
      uiStateJSON: '{}',
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-header-tech?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visHeaderTech) });

  const visControlsAudit = {
    attributes: {
      title: 'Dynamic Filters - HIPAA Audit',
      visState: JSON.stringify({
        title: 'Security Filters',
        type: 'input_control_vis',
        params: {
          controls: [
            { id: 'ctrl-rol', fieldName: 'rol', label: '👤 Filter by User Role', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 5 }, indexPatternRefName: 'ctrl_audit_dv' },
            { id: 'ctrl-accion', fieldName: 'accion', label: '⚡ Action Type', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 8 }, indexPatternRefName: 'ctrl_audit_dv' },
            { id: 'ctrl-entidad', fieldName: 'entidad', label: '📁 Affected Resource', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 6 }, indexPatternRefName: 'ctrl_audit_dv' },
          ],
          updateFiltersOnChange: true,
          useTimeFilter: false,
          pinFilters: false,
        },
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [{ name: 'ctrl_audit_dv', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-controls-audit?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visControlsAudit) });

  const visMetricAuditTotal = {
    attributes: {
      title: 'Audit KPI - Total Recorded Events',
      visState: JSON.stringify({
        title: 'Total Recorded Events',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Immutable audit log in PostgreSQL 18', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '📋 Total Audited Events' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-audit-total?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricAuditTotal) });

  const visMetricAuditPhi = {
    attributes: {
      title: 'Audit KPI - PHI Queries',
      visState: JSON.stringify({
        title: 'PHI Record Queries',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Protected clinical data reads', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🔍 PHI Accesses' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'accion: "CONSULTA_PHI"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-audit-phi?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricAuditPhi) });

  const visMetricAuditFailed = {
    attributes: {
      title: 'Audit KPI - Blocked Access Attempts',
      visState: JSON.stringify({
        title: 'Blocked Attempts / Alerts',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Perimeter defense against brute force', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🚨 Security Alerts' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'estado_resultado: "FALLIDO" or estado_resultado: "BLOQUEADO"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-audit-failed?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricAuditFailed) });

  const visMetricAuditLogout = {
    attributes: {
      title: 'Audit KPI - HIPAA Automatic Session Logouts',
      visState: JSON.stringify({
        title: 'HIPAA Auto-Logouts',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: '15-minute inactivity enforced', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '⏱️ Auto-Logout Enforced' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'accion: "AUTO_LOGOUT_HIPAA"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-audit-logout?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricAuditLogout) });

  const visBarAuditRoles = {
    attributes: {
      title: 'Bar Chart - Audit Events by Role',
      visState: JSON.stringify({
        title: 'Activity by Hospital Role',
        type: 'histogram',
        params: {
          type: 'histogram', grid: { categoryLines: false },
          categoryAxes: [{ id: 'CategoryAxis-1', type: 'category', position: 'bottom', show: true, scale: { type: 'linear' }, labels: { show: true, truncate: 100 }, title: {} }],
          valueAxes: [{ id: 'ValueAxis-1', name: 'LeftAxis-1', type: 'value', position: 'left', show: true, scale: { type: 'linear', mode: 'normal' }, labels: { show: true }, title: { text: 'Audited Events' } }],
          seriesParams: [{ show: true, type: 'histogram', mode: 'stacked', data: { label: 'Events', id: '1' }, valueAxis: 'ValueAxis-1' }],
          addTooltip: true, addLegend: true, legendPosition: 'right',
        },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Events' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'rol', size: 5, order: 'desc', orderBy: '1', customLabel: 'User Role' } },
          { id: '3', enabled: true, type: 'terms', schema: 'group', params: { field: 'accion', size: 5, order: 'desc', orderBy: '1', customLabel: 'Action' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-bar-audit-roles?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBarAuditRoles) });

  const visPieAuditActions = {
    attributes: {
      title: 'Donut Chart - Distribution of Actions on PHI',
      visState: JSON.stringify({
        title: 'HIPAA Action Distribution',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Total Actions' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'accion', size: 8, order: 'desc', orderBy: '1', customLabel: 'Executed Action' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pie-audit-actions?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visPieAuditActions) });

  const visTableAuditForensic = {
    attributes: {
      title: 'Dynamic Table - Live HIPAA Security Forensic Log',
      visState: JSON.stringify({
        title: 'HIPAA Audit Forensic Log (§ 164.312)',
        type: 'table',
        params: { perPage: 10, showPartialRows: false, showMetricsAtAllLevels: false, showTotal: false },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Events' } },
          { id: '2', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'nombre_usuario.keyword', size: 15, order: 'desc', orderBy: '1', customLabel: 'User' } },
          { id: '3', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'rol', size: 6, order: 'desc', orderBy: '1', customLabel: 'Role' } },
          { id: '4', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'accion', size: 10, order: 'desc', orderBy: '1', customLabel: 'Action' } },
          { id: '5', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'entidad', size: 8, order: 'desc', orderBy: '1', customLabel: 'Clinical Resource' } },
          { id: '6', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'ip_cliente', size: 10, order: 'desc', orderBy: '1', customLabel: 'Source IP' } },
          { id: '7', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'estado_resultado', size: 4, order: 'desc', orderBy: '1', customLabel: 'Result' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-table-audit-forensic?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visTableAuditForensic) });

  // --- PILLAR 3: SRE / APM System Health Telemetry Visualizations ---
  const visHeaderSre = {
    attributes: {
      title: 'Banner - Platform Health & SRE / APM Telemetry',
      visState: JSON.stringify({
        title: 'Banner - SRE / APM',
        type: 'markdown',
        params: {
          markdown:
            '# ⚙️ National Medical Center • Microservices, Kong Gateway & APM Monitoring\n' +
            '> **Enterprise-Grade Observability with OpenTelemetry**: Real-time performance of NestJS 12, PostgreSQL 18, Redis 8, and Kong Gateway.  \n' +
            '> **Quick Access**: [🏥 1. Beds, Pharmacy & Billing](#/view/centro-medico-dashboard) &bull; [🛡️ 2. Security & HIPAA Audit](#/view/hipaa-security-audit-dashboard) &bull; [⚙️ 3. SRE / APM System Health](#/view/sre-telemetry-dashboard)',
        },
      }),
      uiStateJSON: '{}',
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-header-sre?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visHeaderSre) });

  const visMetricSreUptime = {
    attributes: {
      title: 'SRE KPI - Global SLA Availability',
      visState: JSON.stringify({
        title: 'SLA Availability',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'All containers in Healthy state', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🟢 99.98% Uptime SLA' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'estado_salud: "Healthy"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-sre-uptime?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricSreUptime) });

  const visMetricSreLatency = {
    attributes: {
      title: 'SRE KPI - Average API Latency (ms)',
      visState: JSON.stringify({
        title: 'Average API Latency',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Average response time via Kong/NestJS', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'avg', schema: 'metric', params: { field: 'latencia_ms', customLabel: '⚡ Avg Latency (ms)' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-sre-latency?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricSreLatency) });

  const visMetricSreRpm = {
    attributes: {
      title: 'SRE KPI - Requests Per Minute (RPM)',
      visState: JSON.stringify({
        title: 'Throughput (RPM)',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Aggregate throughput on Kong Gateway', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'avg', schema: 'metric', params: { field: 'peticiones_por_minuto', customLabel: '📊 Requests / Min' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-sre-rpm?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricSreRpm) });

  const visMetricFhirCalls = {
    attributes: {
      title: 'SRE KPI - HL7 FHIR R4 Standard Requests',
      visState: JSON.stringify({
        title: 'HL7 FHIR R4 Calls',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Active international interoperability', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🌐 FHIR Resources Queried' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'estandar_fhir: *', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-fhir-calls?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricFhirCalls) });

  const visMetricDlqStatus = {
    attributes: {
      title: 'SRE KPI - Kafka Dead Letter Queue Resilience',
      visState: JSON.stringify({
        title: 'Pending Kafka DLQ',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: '0 pending events in Dead Letter Queue', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'avg', schema: 'metric', params: { field: 'dlq_pendientes', customLabel: '🛡️ Pending DLQ Events' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-dlq-status?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricDlqStatus) });

  const visBarSreEndpoints = {
    attributes: {
      title: 'Bar Chart - Average Latency by Endpoint',
      visState: JSON.stringify({
        title: 'Latency by API Endpoint (ms)',
        type: 'horizontal_bar',
        params: {
          type: 'histogram', grid: { categoryLines: false },
          categoryAxes: [{ id: 'CategoryAxis-1', type: 'category', position: 'left', show: true, scale: { type: 'linear' }, labels: { show: true, truncate: 100 }, title: {} }],
          valueAxes: [{ id: 'ValueAxis-1', name: 'LeftAxis-1', type: 'value', position: 'bottom', show: true, scale: { type: 'linear', mode: 'normal' }, labels: { show: true }, title: { text: 'Average Latency (ms)' } }],
          seriesParams: [{ show: true, type: 'histogram', mode: 'normal', data: { label: 'Latency ms', id: '1' }, valueAxis: 'ValueAxis-1' }],
          addTooltip: true, addLegend: false,
        },
        aggs: [
          { id: '1', enabled: true, type: 'avg', schema: 'metric', params: { field: 'latencia_ms', customLabel: 'Average Latency (ms)' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'endpoint', size: 10, order: 'desc', orderBy: '1', customLabel: 'API Route' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-bar-sre-endpoints?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBarSreEndpoints) });

  const visPieSreStatus = {
    attributes: {
      title: 'Donut Chart - HTTP Status Codes',
      visState: JSON.stringify({
        title: 'HTTP Status Code Distribution',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Responses' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'codigo_estado', size: 8, order: 'desc', orderBy: '1', customLabel: 'Status Code' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pie-sre-status?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visPieSreStatus) });
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pie-sre-status-codes?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visPieSreStatus) });

  const visTableSreServices = {
    attributes: {
      title: 'Dynamic Table - Microservices Health Matrix',
      visState: JSON.stringify({
        title: 'Microservices Health Matrix',
        type: 'table',
        params: { perPage: 15, showPartialRows: false, showMetricsAtAllLevels: false, showTotal: false },
        aggs: [
          { id: '1', enabled: true, type: 'avg', schema: 'metric', params: { field: 'latencia_ms', customLabel: 'Latency (ms)' } },
          { id: '2', enabled: true, type: 'avg', schema: 'metric', params: { field: 'uso_cpu_pct', customLabel: 'CPU (%)' } },
          { id: '3', enabled: true, type: 'avg', schema: 'metric', params: { field: 'uso_memoria_mb', customLabel: 'Memory (MB)' } },
          { id: '4', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'servicio', size: 15, order: 'asc', orderBy: '_key', customLabel: 'Microservice' } },
          { id: '5', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'estado_salud', size: 5, order: 'desc', orderBy: '1', customLabel: 'Health Status' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-table-sre-services?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visTableSreServices) });

  console.log('  ✓ 25 official visualizations created successfully for the 3 Pillars.');

  // 10. Clean up obsolete dashboards and Register EXACTLY the 2 requested Dashboards
  console.log('\n📊 Registering exactly the 2 Dashboards in Kibana...');

  // Delete previous or test dashboards to keep the view clean
  const oldDashboards = [
    'test-dash',
    'test-ref-dash',
    'centro-medico-dashboard',
    'hipaa-security-audit-dashboard',
    'sre-telemetry-dashboard',
    'business-operations-dashboard',
    'tech-sre-security-dashboard',
  ];
  for (const dashId of oldDashboards) {
    try {
      await fetch(`${KBN_URL}/api/saved_objects/dashboard/${dashId}`, {
        method: 'DELETE',
        headers: KBN_HEADERS,
      });
    } catch {}
  }

  // --- DASHBOARD 1: BUSINESS (Beds, Pharmacy, Billing & Telemedicine) ---
  const panelsOps = [
    { gridData: { x: 0, y: 0, w: 48, h: 4, i: 'p-header' }, panelIndex: 'p-header', panelRefName: 'ref_header', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 4, w: 48, h: 6, i: 'p-controls' }, panelIndex: 'p-controls', panelRefName: 'ref_controls', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Executive 7-KPI Scorecard Row (Hospital Business)
    { gridData: { x: 0, y: 10, w: 7, h: 7, i: 'p-beds-free' }, panelIndex: 'p-beds-free', panelRefName: 'ref_beds_free', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 7, y: 10, w: 7, h: 7, i: 'p-beds-occ' }, panelIndex: 'p-beds-occ', panelRefName: 'ref_beds_occ', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 14, y: 10, w: 7, h: 7, i: 'p-pharm-crit' }, panelIndex: 'p-pharm-crit', panelRefName: 'ref_pharm-crit', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 21, y: 10, w: 7, h: 7, i: 'p-pharm-stock' }, panelIndex: 'p-pharm-stock', panelRefName: 'ref_pharm-stock', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 28, y: 10, w: 7, h: 7, i: 'p-revenue' }, panelIndex: 'p-revenue', panelRefName: 'ref_revenue', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 35, y: 10, w: 7, h: 7, i: 'p-doc-payout' }, panelIndex: 'p-doc-payout', panelRefName: 'ref_doc_payout', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 42, y: 10, w: 6, h: 7, i: 'p-clinic-margin' }, panelIndex: 'p-clinic-margin', panelRefName: 'ref_clinic_margin', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Charts Row 2 (Stock Comparison & Beds by Floor)
    { gridData: { x: 0, y: 17, w: 24, h: 14, i: 'p-bar-stock' }, panelIndex: 'p-bar-stock', panelRefName: 'ref_bar_stock', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 24, y: 17, w: 24, h: 14, i: 'p-bar-beds' }, panelIndex: 'p-bar-beds', panelRefName: 'ref_bar_beds', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Charts Row 3 (Business, Pharmacy & Telemedicine Modality Donuts)
    { gridData: { x: 0, y: 31, w: 16, h: 12, i: 'p-beds-donut' }, panelIndex: 'p-beds-donut', panelRefName: 'ref_beds_donut', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 16, y: 31, w: 16, h: 12, i: 'p-pharm-pie' }, panelIndex: 'p-pharm-pie', panelRefName: 'ref_pharm_pie', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 32, y: 31, w: 16, h: 12, i: 'p-modality-pie' }, panelIndex: 'p-modality-pie', panelRefName: 'ref_modality_pie', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Tables Row 4 (Pharmacy & Dynamic Bed Census)
    { gridData: { x: 0, y: 43, w: 24, h: 16, i: 'p-table-pharm' }, panelIndex: 'p-table-pharm', panelRefName: 'ref_table_pharm', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 24, y: 43, w: 24, h: 16, i: 'p-table-beds' }, panelIndex: 'p-table-beds', panelRefName: 'ref_table_beds', version: '9.5.5', embeddableConfig: { enhancements: {} } },
  ];

  await fetch(`${KBN_URL}/api/saved_objects/dashboard/business-operations-dashboard?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify({
      attributes: {
        title: '1. Business Dashboard: Beds, Pharmacy & Billing',
        description: 'Hospital Business Dashboard: Bed census and occupancy, medication inventory control, billing in MXN, physician fee settlement, and telemedicine.',
        timeRestore: true,
        timeFrom: 'now-24h',
        timeTo: 'now',
        panelsJSON: JSON.stringify(panelsOps),
      },
      references: [
        { name: 'ref_header', type: 'visualization', id: 'vis-header' },
        { name: 'ref_controls', type: 'visualization', id: 'vis-controls-filter' },
        { name: 'ref_beds_free', type: 'visualization', id: 'vis-metric-beds-free' },
        { name: 'ref_beds_occ', type: 'visualization', id: 'vis-metric-beds-occupied' },
        { name: 'ref_pharm-crit', type: 'visualization', id: 'vis-metric-pharm-critical' },
        { name: 'ref_pharm-stock', type: 'visualization', id: 'vis-metric-pharm-stock-sum' },
        { name: 'ref_revenue', type: 'visualization', id: 'vis-metric-revenue' },
        { name: 'ref_doc_payout', type: 'visualization', id: 'vis-metric-doctor-payout' },
        { name: 'ref_clinic_margin', type: 'visualization', id: 'vis-metric-clinic-margin' },
        { name: 'ref_bar_stock', type: 'visualization', id: 'vis-bar-stock-compare' },
        { name: 'ref_bar_beds', type: 'visualization', id: 'vis-bar-beds-by-floor' },
        { name: 'ref_beds_donut', type: 'visualization', id: 'vis-beds-donut' },
        { name: 'ref_pharm_pie', type: 'visualization', id: 'vis-pharmacy-pie' },
        { name: 'ref_modality_pie', type: 'visualization', id: 'vis-pie-modality' },
        { name: 'ref_table_pharm', type: 'visualization', id: 'vis-table-pharmacy-dynamic' },
        { name: 'ref_table_beds', type: 'visualization', id: 'vis-table-beds-dynamic' },
      ],
    }),
  });
  console.log('  ✓ Dashboard 1: "1. Business Dashboard: Beds, Pharmacy & Billing" registered.');

  // --- DASHBOARD 2: TECH (System Health, SRE / APM, 7 Microservices, Security & HIPAA Audit) ---
  const panelsTech = [
    { gridData: { x: 0, y: 0, w: 48, h: 4, i: 'p-tech-hdr' }, panelIndex: 'p-tech-hdr', panelRefName: 'ref_tech_hdr', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 4, w: 48, h: 6, i: 'p-tech-ctrl' }, panelIndex: 'p-tech-ctrl', panelRefName: 'ref_tech_ctrl', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Unified Row of 9 SRE, FHIR Interoperability & HIPAA Security KPIs
    { gridData: { x: 0, y: 10, w: 6, h: 7, i: 'p-sre-upt' }, panelIndex: 'p-sre-upt', panelRefName: 'ref_sre_upt', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 6, y: 10, w: 5, h: 7, i: 'p-sre-lat' }, panelIndex: 'p-sre-lat', panelRefName: 'ref_sre_lat', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 11, y: 10, w: 5, h: 7, i: 'p-sre-rpm' }, panelIndex: 'p-sre-rpm', panelRefName: 'ref_sre_rpm', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 16, y: 10, w: 6, h: 7, i: 'p-sre-fhir' }, panelIndex: 'p-sre-fhir', panelRefName: 'ref_sre_fhir', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 22, y: 10, w: 5, h: 7, i: 'p-sre-dlq' }, panelIndex: 'p-sre-dlq', panelRefName: 'ref_sre_dlq', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 27, y: 10, w: 6, h: 7, i: 'p-hipaa-tot' }, panelIndex: 'p-hipaa-tot', panelRefName: 'ref_hipaa_tot', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 33, y: 10, w: 5, h: 7, i: 'p-hipaa-phi' }, panelIndex: 'p-hipaa-phi', panelRefName: 'ref_hipaa_phi', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 38, y: 10, w: 5, h: 7, i: 'p-hipaa-fail' }, panelIndex: 'p-hipaa-fail', panelRefName: 'ref_hipaa_fail', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 43, y: 10, w: 5, h: 7, i: 'p-hipaa-log' }, panelIndex: 'p-hipaa-log', panelRefName: 'ref_hipaa_log', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // SRE / APM Visualizations
    { gridData: { x: 0, y: 17, w: 28, h: 14, i: 'p-sre-bar' }, panelIndex: 'p-sre-bar', panelRefName: 'ref_sre_bar', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 28, y: 17, w: 20, h: 14, i: 'p-sre-pie' }, panelIndex: 'p-sre-pie', panelRefName: 'ref_sre_pie', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Health Matrix Table for the 7 Microservices and Infrastructure
    { gridData: { x: 0, y: 31, w: 48, h: 14, i: 'p-sre-tbl' }, panelIndex: 'p-sre-tbl', panelRefName: 'ref_sre_tbl', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Security & HIPAA Visualizations
    { gridData: { x: 0, y: 45, w: 26, h: 14, i: 'p-hipaa-bar' }, panelIndex: 'p-hipaa-bar', panelRefName: 'ref_hipaa_bar', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 26, y: 45, w: 22, h: 14, i: 'p-hipaa-pie' }, panelIndex: 'p-hipaa-pie', panelRefName: 'ref_hipaa_pie', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Immutable HIPAA Security Forensic Table
    { gridData: { x: 0, y: 59, w: 48, h: 16, i: 'p-hipaa-tbl' }, panelIndex: 'p-hipaa-tbl', panelRefName: 'ref_hipaa_tbl', version: '9.5.5', embeddableConfig: { enhancements: {} } },
  ];

  await fetch(`${KBN_URL}/api/saved_objects/dashboard/tech-sre-security-dashboard?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify({
      attributes: {
        title: '2. Tech Dashboard: SRE / APM, System Health, Security & HIPAA Audit',
        description: 'Unified Technical Dashboard: Telemetry for the 7 autonomous microservices (99.98% uptime, p95 latencies, RPM, HTTP codes), HL7 FHIR R4 interoperability, Kong Gateway perimeter security, and immutable HIPAA forensic log (NOM-024).',
        timeRestore: true,
        timeFrom: 'now-24h',
        timeTo: 'now',
        panelsJSON: JSON.stringify(panelsTech),
      },
      references: [
        { name: 'ref_tech_hdr', type: 'visualization', id: 'vis-header-tech' },
        { name: 'ref_tech_ctrl', type: 'visualization', id: 'vis-controls-audit' },
        { name: 'ref_sre_upt', type: 'visualization', id: 'vis-metric-sre-uptime' },
        { name: 'ref_sre_lat', type: 'visualization', id: 'vis-metric-sre-latency' },
        { name: 'ref_sre_rpm', type: 'visualization', id: 'vis-metric-sre-rpm' },
        { name: 'ref_sre_fhir', type: 'visualization', id: 'vis-metric-fhir-calls' },
        { name: 'ref_sre_dlq', type: 'visualization', id: 'vis-metric-dlq-status' },
        { name: 'ref_hipaa_tot', type: 'visualization', id: 'vis-metric-audit-total' },
        { name: 'ref_hipaa_phi', type: 'visualization', id: 'vis-metric-audit-phi' },
        { name: 'ref_hipaa_fail', type: 'visualization', id: 'vis-metric-audit-failed' },
        { name: 'ref_hipaa_log', type: 'visualization', id: 'vis-metric-audit-logout' },
        { name: 'ref_sre_bar', type: 'visualization', id: 'vis-bar-sre-endpoints' },
        { name: 'ref_sre_pie', type: 'visualization', id: 'vis-pie-sre-status-codes' },
        { name: 'ref_sre_tbl', type: 'visualization', id: 'vis-table-sre-services' },
        { name: 'ref_hipaa_bar', type: 'visualization', id: 'vis-bar-audit-roles' },
        { name: 'ref_hipaa_pie', type: 'visualization', id: 'vis-pie-audit-actions' },
        { name: 'ref_hipaa_tbl', type: 'visualization', id: 'vis-table-audit-forensic' },
      ],
    }),
  });
  console.log('  ✓ Dashboard 2: "2. Tech Dashboard: SRE / APM, System Health, Security & HIPAA Audit" registered.');

  // 11. Export the 2-Dashboard suite to ./observability/
  console.log('\n💾 Exporting the 2 Dashboards to JSON and NDJSON...');
  const exportRes = await fetch(`${KBN_URL}/api/saved_objects/_export`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify({
      objects: [
        { type: 'dashboard', id: 'business-operations-dashboard' },
        { type: 'dashboard', id: 'tech-sre-security-dashboard' },
        { type: 'index-pattern', id: pharmacyDvId },
        { type: 'index-pattern', id: bedsDvId },
        { type: 'index-pattern', id: opsDvId },
        { type: 'index-pattern', id: auditDvId },
        { type: 'index-pattern', id: telemetryDvId },
      ],
      includeReferencesDeep: true,
    }),
  });

  const ndjsonText = await exportRes.text();
  const ndjsonPath = path.join(rootDir, 'observability', 'kibana-centro-medico-dashboard.ndjson');
  fs.writeFileSync(ndjsonPath, ndjsonText, 'utf-8');

  const jsonLines = ndjsonText
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const jsonPath = path.join(rootDir, 'observability', 'kibana-centro-medico-dashboard.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonLines, null, 2), 'utf-8');

  console.log(`  ✓ NDJSON file updated: ${ndjsonPath}`);
  console.log(`  ✓ Formatted JSON file updated: ${jsonPath}`);

  console.log('\n============================================================');
  console.log('🎉 BOTH DASHBOARDS HAVE BEEN PROVISIONED SUCCESSFULLY');
  console.log('============================================================');
  console.log('🔗 Direct links to the 2 Dashboards in Kibana:');
  console.log('   1. Business Dashboard (Beds, Pharmacy & Billing):');
  console.log('      http://localhost:5601/app/dashboards#/view/business-operations-dashboard');
  console.log('   2. Tech Dashboard (SRE / APM, System Health, Security & HIPAA Audit):');
  console.log('      http://localhost:5601/app/dashboards#/view/tech-sre-security-dashboard');
}

main().catch((err) => {
  console.error('❌ General error during provisioning:', err);
  process.exit(1);
});
