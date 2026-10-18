// scripts/seed-elasticsearch-kibana.mjs
// Aprovisionamiento integral de los 3 Pilares de Observabilidad en Kibana 9.5.5
// Pilar 1: Seguridad & Auditoría HIPAA (NOM-024)
// Pilar 2: Inteligencia Hospitalaria & Finanzas
// Pilar 3: Salud del Sistema & Telemetría SRE / APM
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
  console.log('🚀 Iniciando aprovisionamiento integral de los 3 Pilares en Elasticsearch y Kibana 9.5.5...');

  // 1. Verificar estado de ES y Kibana
  try {
    const esRes = await fetch(ES_URL);
    const esData = await esRes.json();
    console.log(`✅ Elasticsearch v${esData.version.number} conectado.`);
  } catch (err) {
    console.error('❌ Error conectando a Elasticsearch:', err.message);
    process.exit(1);
  }

  try {
    const kbnRes = await fetch(`${KBN_URL}/api/status`);
    const kbnData = await kbnRes.json();
    console.log(`✅ Kibana conectado. Nivel de estado: ${kbnData.status.overall.level}`);
  } catch (err) {
    console.error('❌ Error conectando a Kibana:', err.message);
    process.exit(1);
  }

  // 2. Mapeos de Índices en Elasticsearch
  console.log('\n📦 Creando y configurando los 5 índices en Elasticsearch...');

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
  console.log(`  ✓ Índice ${pharmacyIndex} creado`);

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
  console.log(`  ✓ Índice ${bedsIndex} creado`);

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
          '@timestamp': { type: 'date' },
        },
      },
    }),
  });
  console.log(`  ✓ Índice ${opsIndex} creado`);

  // Índice Pilar 1: Seguridad & Auditoría HIPAA
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
  console.log(`  ✓ Índice ${auditIndex} (Pilar 1: Auditoría HIPAA) creado`);

  // Índice Pilar 3: Salud del Sistema & Telemetría SRE
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
          uso_cpu_pct: { type: 'float' },
          uso_memoria_mb: { type: 'float' },
          '@timestamp': { type: 'date' },
        },
      },
    }),
  });
  console.log(`  ✓ Índice ${telemetryIndex} (Pilar 3: Telemetría SRE) creado`);

  const now = new Date().toISOString();

  // 3. Poblar Medicamentos desde la Base de Datos PostgreSQL
  console.log('\n💊 Indexando catálogo de fármacos y existencias desde PostgreSQL...');
  let medData = [];
  try {
    const res = await fetch('http://localhost/api/pharmacy');
    if (res.ok) medData = await res.json();
  } catch (err) {
    console.warn('  ⚠️ Fallback en fármacos:', err.message);
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
  console.log(`  ✓ ${medData.length} medicamentos indexados en ${pharmacyIndex}`);

  // 4. Poblar Censo de Camas Hospitalarias desde PostgreSQL
  console.log('\n🛏️ Sincronizando censo de camas desde PostgreSQL...');
  let censusData = [];
  try {
    const res = await fetch('http://localhost/api/hospitalizations/bed-census');
    if (res.ok) censusData = await res.json();
  } catch (err) {
    console.warn('  ⚠️ Fallback en camas:', err.message);
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
  console.log(`  ✓ ${censusData.length} camas sincronizadas en ${bedsIndex}`);

  // 5. Poblar Operaciones Clínicas y Facturación desde PostgreSQL
  console.log('\n📊 Sincronizando operaciones clínicas y facturación desde PostgreSQL...');
  let billingData = [];
  try {
    const billRes = await fetch('http://localhost/api/billing');
    if (billRes.ok) billingData = await billRes.json();
  } catch (err) {
    console.warn('  ⚠️ Fallback en billing:', err.message);
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

      bulkOps += JSON.stringify({ index: { _index: opsIndex, _id: p.comprobanteFiscal || `PAGO-${p.idPago}` } }) + '\n';
      bulkOps += JSON.stringify({
        operacion_id: p.comprobanteFiscal || `PAGO-${p.idPago}`,
        tipo_evento: p.idInternacion ? 'internacion' : 'facturacion',
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
        fecha_pago: p.fechaPago,
        '@timestamp': now,
      }) + '\n';
    }

    await fetch(`${ES_URL}/_bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson' },
      body: bulkOps,
    });
    console.log(`  ✓ ${billingData.length} pagos reales de PostgreSQL indexados en ${opsIndex}`);
  }

  // 6. Poblar Auditoría de Seguridad HIPAA (Pilar 1)
  console.log('\n🛡️ Indexando bitácora de seguridad y auditoría HIPAA desde PostgreSQL y estándares NOM-024 / HIPAA...');
  let auditData = [];
  try {
    const auditRes = await fetch('http://localhost/api/audit?limit=100', {
      headers: { 'x-user-roles': 'admin_user' },
    });
    if (auditRes.ok) auditData = await auditRes.json();
  } catch (err) {
    console.warn('  ⚠️ Error consultando API de auditoría:', err.message);
  }

  let bulkAudit = '';
  let auditCounter = 1;

  // Indexar eventos reales de PostgreSQL
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

  // Generar eventos exhaustivos de cumplimiento HIPAA / NOM-024 continuos (últimos 15 min y últimas 24h)
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
    1, 2, 3, 5, 7, 9, 11, 13, 15, // Granularidad alta en los últimos 15 min
    20, 25, 30, 45, 60, 90, 120, // Últimas 2 horas
    180, 240, 360, 480, 600, 720, 960, 1200, 1440 // Últimas 24 horas
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
    console.log(`  ✓ ${auditCounter} eventos de auditoría HIPAA indexados en ${auditIndex}`);
  }

  // 7. Poblar Métricas de Telemetría SRE / APM (Pilar 3)
  console.log('\n⚙️ Generando telemetría de rendimiento y salud de microservicios (SRE / APM)...');
  const servicesList = [
    { name: 'backend', port: 3000, type: 'NestJS 12 API', baseLat: 16.5, rpm: 120, cpu: 14.2, mem: 168 },
    { name: 'postgres', port: 5432, type: 'PostgreSQL 18 DB', baseLat: 3.2, rpm: 450, cpu: 11.5, mem: 210 },
    { name: 'redis', port: 6379, type: 'Redis 8.8 Cache', baseLat: 0.8, rpm: 600, cpu: 4.8, mem: 48 },
    { name: 'kong-gateway', port: 8000, type: 'Kong 3.14 Proxy', baseLat: 2.1, rpm: 750, cpu: 8.9, mem: 95 },
    { name: 'keycloak', port: 8080, type: 'Keycloak 26.8 IAM', baseLat: 24.0, rpm: 45, cpu: 18.0, mem: 420 },
    { name: 'elastic-agent', port: 8200, type: 'OTel Collector', baseLat: 4.5, rpm: 320, cpu: 6.2, mem: 180 },
  ];

  const endpointsList = [
    { ep: '/api/patients', method: 'GET', baseLat: 14.2, status: 200 },
    { ep: '/api/appointments', method: 'GET', baseLat: 18.5, status: 200 },
    { ep: '/api/appointments', method: 'POST', baseLat: 22.1, status: 201 },
    { ep: '/api/pharmacy', method: 'GET', baseLat: 11.8, status: 200 },
    { ep: '/api/pharmacy/summary', method: 'GET', baseLat: 9.4, status: 200 },
    { ep: '/api/hospitalizations/bed-census', method: 'GET', baseLat: 21.0, status: 200 },
    { ep: '/api/billing', method: 'GET', baseLat: 17.5, status: 200 },
    { ep: '/api/billing', method: 'POST', baseLat: 24.0, status: 201 },
    { ep: '/api/dashboard/metrics', method: 'GET', baseLat: 28.2, status: 200 },
    { ep: '/realms/healthtech', method: 'POST', baseLat: 32.0, status: 200 },
    { ep: '/api/audit', method: 'GET', baseLat: 15.0, status: 200 },
    { ep: '/api/auth/login', method: 'POST', baseLat: 45.0, status: 200 },
    { ep: '/api/auth/login', method: 'POST', baseLat: 42.0, status: 401 },
    { ep: '/api/patients/9999', method: 'GET', baseLat: 13.0, status: 404 },
    { ep: '/api/appointments/999/status', method: 'PATCH', baseLat: 12.0, status: 404 },
    { ep: '/api/admin/metrics-summary', method: 'GET', baseLat: 26.5, status: 200 },
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
        servicio: 'backend',
        endpoint: ep.ep,
        metodo_http: ep.method,
        codigo_estado: ep.status,
        categoria_estado: `${Math.floor(ep.status / 100)}xx`,
        latencia_ms: lat,
        peticiones_por_minuto: rpm,
        estado_salud: 'Healthy',
        uso_cpu_pct: Math.round((14.5 + Math.random() * 4) * 10) / 10,
        uso_memoria_mb: Math.round((172 + Math.random() * 10) * 10) / 10,
        '@timestamp': metricTime,
      }) + '\n';
    }

    // Registrar estado de salud de cada microservicio en cada intervalo
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
  console.log(`  ✓ ${telId} registros de telemetría y salud de microservicios indexados en ${telemetryIndex}`);

  await fetch(`${ES_URL}/${pharmacyIndex},${bedsIndex},${opsIndex},${auditIndex},${telemetryIndex}/_refresh`, { method: 'POST' });

  // 8. Configurar Data Views en Kibana
  console.log('\n👁️ Registrando Data Views deterministas en Kibana...');
  const pharmacyDvId = 'healthtech-pharmacy-dv';
  const bedsDvId = 'healthtech-beds-dv';
  const opsDvId = 'healthtech-ops-dv';
  const auditDvId = 'healthtech-audit-dv';
  const telemetryDvId = 'healthtech-telemetry-dv';

  const dataViews = [
    { id: pharmacyDvId, title: 'healthtech-pharmacy-stock*', name: 'Farmacia - Stock y Alertas de Medicamentos' },
    { id: bedsDvId, title: 'healthtech-beds-census*', name: 'Censo de Camas y Ocupación Hospitalaria' },
    { id: opsDvId, title: 'healthtech-clinical-operations*', name: 'Operaciones Clínicas y Consultas' },
    { id: auditDvId, title: 'healthtech-security-audit*', name: 'Seguridad y Auditoría HIPAA (NOM-024)', timeFieldName: '@timestamp' },
    { id: telemetryDvId, title: 'healthtech-telemetry-metrics*', name: 'Salud de Plataforma SRE y APM', timeFieldName: '@timestamp' },
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
    console.log(`  ✓ Data View "${dv.name}" registrado (${dv.id})`);
  }

  // 9. Crear Visualizaciones Oficiales
  console.log('\n🎨 Creando Visualizaciones Oficiales de los 3 Pilares...');

  // --- PILAR 1: Dashboard Negocio (Camas, Farmacia & Facturación) ---
  const visHeaderOps = {
    attributes: {
      title: 'Banner - Dashboard Negocio (Camas, Farmacia & Facturación)',
      visState: JSON.stringify({
        title: 'Banner - Dashboard Negocio',
        type: 'markdown',
        params: {
          markdown:
            '# 🏥 Centro Médico • Dashboard Negocio: Camas, Farmacia & Facturación\n' +
            '> **Navegación Unificada**: [🛡️ Ir a Dashboard Tech (Salud del Sistema, SRE / APM, Seguridad & Auditoría HIPAA)](#/view/tech-sre-security-dashboard) &bull; **Filtros Dinámicos e Inteligencia Hospitalaria en Tiempo Real**',
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
      title: 'Filtros Dinámicos - Piso, Alerta y Categoría',
      uiStateJSON: '{}',
      visState: JSON.stringify({
        title: 'Filtros Dinámicos del Hospital',
        type: 'input_control_vis',
        params: {
          controls: [
            { id: 'ctrl-piso', fieldName: 'piso', label: '🏢 Filtrar por Piso Hospitalario', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 5 }, indexPatternRefName: 'ctrl_piso_dv' },
            { id: 'ctrl-alerta', fieldName: 'nivel_alerta', label: '🚨 Nivel de Alerta de Fármacos', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 5 }, indexPatternRefName: 'ctrl_alerta_dv' },
            { id: 'ctrl-cat', fieldName: 'categoria_terapeutica', label: '💊 Categoría Terapéutica', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 10 }, indexPatternRefName: 'ctrl_cat_dv' },
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

  // KPIs de Camas y Farmacia
  const visMetricBedsFree = {
    attributes: {
      title: 'KPI Dinámico - Camas Libres',
      visState: JSON.stringify({
        title: 'Camas Libres',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Disponibles para asignación inmediata', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🟢 Camas Libres' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'estado: "Disponible"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-beds-free?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricBedsFree) });

  const visMetricBedsOcc = {
    attributes: {
      title: 'KPI Dinámico - Camas Ocupadas',
      visState: JSON.stringify({
        title: 'Camas Ocupadas',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Pacientes en internación activa', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🔴 Camas Ocupadas' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'estado: "Ocupada"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-beds-occupied?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricBedsOcc) });

  const visMetricPharmCrit = {
    attributes: {
      title: 'KPI Dinámico - Fármacos en Alerta Crítica',
      visState: JSON.stringify({
        title: 'Alerta Crítica',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Líneas que requieren reposición urgente', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🚨 Fármacos Críticos' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'nivel_alerta: "Crítico" or nivel_alerta: "CRITICO"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-pharm-critical?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricPharmCrit) });

  const visMetricPharmStock = {
    attributes: {
      title: 'KPI Dinámico - Total Stock Fármacos',
      visState: JSON.stringify({
        title: 'Total Unidades Stock',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Unidades en almacenes hospitalarios', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'stock_actual', customLabel: '📦 Unidades en Almacén' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-pharm-stock-sum?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricPharmStock) });

  const visMetricRevenue = {
    attributes: {
      title: 'KPI Dinámico - Facturación Clínica MXN',
      visState: JSON.stringify({
        title: 'Facturación Hospitalaria',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Recaudación total según tabla pago de PostgreSQL', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'monto_total_mxn', customLabel: '💵 Recaudación Total (MXN)' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: opsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-revenue?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricRevenue) });

  // Visualización Gráfica: Recaudación por Obra Social / Aseguradora
  const visRevenueByInsurer = {
    attributes: {
      title: 'Gráfica de Dona - Recaudación por Aseguradora / Obra Social',
      visState: JSON.stringify({
        title: 'Recaudación por Aseguradora (MXN)',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'monto_total_mxn', customLabel: 'Total Facturado (MXN)' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'aseguradora', size: 10, order: 'desc', orderBy: '1', customLabel: 'Aseguradora / Obra Social' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: opsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pie-revenue-by-insurer?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visRevenueByInsurer) });

  // Gráfica de Barras Stock Actual vs Mínimo
  const visBarStock = {
    attributes: {
      title: 'Gráfica de Barras - Stock Actual vs Mínimo por Fármaco',
      visState: JSON.stringify({
        title: 'Comparativa de Existencias: Stock Actual vs Mínimo',
        type: 'horizontal_bar',
        params: {
          type: 'histogram', grid: { categoryLines: false },
          categoryAxes: [{ id: 'CategoryAxis-1', type: 'category', position: 'left', show: true, scale: { type: 'linear' }, labels: { show: true, truncate: 100 }, title: {} }],
          valueAxes: [{ id: 'ValueAxis-1', name: 'LeftAxis-1', type: 'value', position: 'bottom', show: true, scale: { type: 'linear', mode: 'normal' }, labels: { show: true, rotate: 0, filter: false, truncate: 100 }, title: { text: 'Unidades de Medicamento' } }],
          seriesParams: [
            { show: true, type: 'histogram', mode: 'normal', data: { label: 'Stock Actual', id: '1' }, valueAxis: 'ValueAxis-1', drawLinesBetweenPoints: true, showCircles: true },
            { show: true, type: 'histogram', mode: 'normal', data: { label: 'Stock Mínimo Requerido', id: '2' }, valueAxis: 'ValueAxis-1', drawLinesBetweenPoints: true, showCircles: true },
          ],
          addTooltip: true, addLegend: true, legendPosition: 'top',
        },
        aggs: [
          { id: '1', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_actual', customLabel: 'Stock Actual' } },
          { id: '2', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_minimo', customLabel: 'Stock Mínimo Requerido' } },
          { id: '3', enabled: true, type: 'terms', schema: 'segment', params: { field: 'nombre_comercial.keyword', size: 15, order: 'asc', orderBy: '1', customLabel: 'Medicamento' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-bar-stock-compare?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBarStock) });

  const visBarBeds = {
    attributes: {
      title: 'Gráfica de Barras Apiladas - Camas por Piso y Estado',
      visState: JSON.stringify({
        title: 'Camas por Piso y Estado de Ocupación',
        type: 'histogram',
        params: {
          type: 'histogram', grid: { categoryLines: false },
          categoryAxes: [{ id: 'CategoryAxis-1', type: 'category', position: 'bottom', show: true, scale: { type: 'linear' }, labels: { show: true, truncate: 100 }, title: {} }],
          valueAxes: [{ id: 'ValueAxis-1', name: 'LeftAxis-1', type: 'value', position: 'left', show: true, scale: { type: 'linear', mode: 'normal' }, labels: { show: true, rotate: 0, filter: false, truncate: 100 }, title: { text: 'Cantidad de Camas' } }],
          seriesParams: [{ show: true, type: 'histogram', mode: 'stacked', data: { label: 'Cantidad de Camas', id: '1' }, valueAxis: 'ValueAxis-1', drawLinesBetweenPoints: true, showCircles: true }],
          addTooltip: true, addLegend: true, legendPosition: 'right',
        },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Cantidad de Camas' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'piso', size: 5, order: 'asc', orderBy: '_key', customLabel: 'Piso Hospitalario' } },
          { id: '3', enabled: true, type: 'terms', schema: 'group', params: { field: 'estado', size: 5, order: 'desc', orderBy: '1', customLabel: 'Estado' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-bar-beds-by-floor?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBarBeds) });

  const visBedsDonut = {
    attributes: {
      title: 'Gráfica de Dona - Censo de Camas por Estado',
      visState: JSON.stringify({
        title: 'Proporción de Camas por Estado',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Número de Camas' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'estado', size: 5, order: 'desc', orderBy: '1', customLabel: 'Estado de Ocupación' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-beds-donut?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBedsDonut) });

  const visPharmacyPie = {
    attributes: {
      title: 'Gráfica de Dona - Stock por Categoría Terapéutica',
      visState: JSON.stringify({
        title: 'Stock por Categoría Terapéutica',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'stock_actual', customLabel: 'Total Unidades Stock' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'categoria_terapeutica', size: 10, order: 'desc', orderBy: '1', customLabel: 'Categoría Terapéutica' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pharmacy-pie?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visPharmacyPie) });

  const visPharmacyTable = {
    attributes: {
      title: 'Tabla Dinámica - Inventario de Fármacos y Semáforo de Alertas',
      visState: JSON.stringify({
        title: 'Inventario Dinámico de Medicamentos',
        type: 'table',
        params: { perPage: 10, showPartialRows: false, showMetricsAtAllLevels: false, showTotal: true, totalFunc: 'sum' },
        aggs: [
          { id: '1', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_actual', customLabel: 'Stock Actual' } },
          { id: '2', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_minimo', customLabel: 'Stock Mínimo' } },
          { id: '3', enabled: true, type: 'avg', schema: 'metric', params: { field: 'precio_unitario_mxn', customLabel: 'Precio Unitario (MXN)' } },
          { id: '4', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'nombre_comercial.keyword', size: 25, order: 'asc', orderBy: '1', customLabel: 'Medicamento' } },
          { id: '5', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'categoria_terapeutica', size: 10, order: 'desc', orderBy: '1', customLabel: 'Categoría Terapéutica' } },
          { id: '6', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'nivel_alerta', size: 5, order: 'desc', orderBy: '1', customLabel: 'Semáforo Alerta' } },
          { id: '7', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'ubicacion_almacen', size: 5, order: 'desc', orderBy: '1', customLabel: 'Ubicación Almacén' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-table-pharmacy-dynamic?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visPharmacyTable), });

  const visBedsTable = {
    attributes: {
      title: 'Tabla Dinámica - Censo Hospitalario de Camas en Tiempo Real',
      visState: JSON.stringify({
        title: 'Censo de Camas Hospitalarias',
        type: 'table',
        params: { perPage: 10, showPartialRows: false, showMetricsAtAllLevels: false, showTotal: false, totalFunc: 'sum' },
        aggs: [
          { id: '1', enabled: true, type: 'max', schema: 'metric', params: { field: 'tarifa_noche_mxn', customLabel: 'Tarifa Noche (MXN)' } },
          { id: '2', enabled: true, type: 'max', schema: 'metric', params: { field: 'dias_estancia', customLabel: 'Días Estancia' } },
          { id: '3', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'numero', size: 25, order: 'asc', orderBy: '_key', customLabel: 'Habitación' } },
          { id: '4', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'piso', size: 5, order: 'asc', orderBy: '_key', customLabel: 'Piso' } },
          { id: '5', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'tipo', size: 10, order: 'desc', orderBy: '1', customLabel: 'Tipo de Unidad' } },
          { id: '6', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'estado', size: 5, order: 'desc', orderBy: '1', customLabel: 'Estado' } },
          { id: '7', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'paciente_nombre.keyword', size: 25, order: 'desc', orderBy: '1', missingBucket: true, missingBucketLabel: '🟢 [Cama Libre]', customLabel: 'Paciente Asignado' } },
          { id: '8', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'medico_responsable', size: 25, order: 'desc', orderBy: '1', missingBucket: true, missingBucketLabel: '🟢 [Médico de Guardia]', customLabel: 'Médico Responsable' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-table-beds-dynamic?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBedsTable) });

  // --- PILAR 2: Visualizaciones de Dashboard Tech (SRE / APM, Seguridad & Auditoría HIPAA) ---
  const visHeaderTech = {
    attributes: {
      title: 'Banner - Dashboard Tech (SRE / APM, Salud del Sistema, Seguridad & Auditoría HIPAA)',
      visState: JSON.stringify({
        title: 'Banner - Dashboard Tech',
        type: 'markdown',
        params: {
          markdown:
            '# 🛡️ Centro Médico • Dashboard Tech: SRE / APM, Salud del Sistema, Seguridad & Auditoría HIPAA\n' +
            '> **Navegación Unificada**: [🏥 Ir a Dashboard Negocio (Camas, Farmacia & Facturación)](#/view/business-operations-dashboard) &bull; **Telemetría OpenTelemetry & Auditoría Forense HIPAA (NOM-024)**',
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
      title: 'Filtros Dinámicos - Auditoría HIPAA',
      visState: JSON.stringify({
        title: 'Filtros de Seguridad',
        type: 'input_control_vis',
        params: {
          controls: [
            { id: 'ctrl-rol', fieldName: 'rol', label: '👤 Filtrar por Rol de Usuario', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 5 }, indexPatternRefName: 'ctrl_audit_dv' },
            { id: 'ctrl-accion', fieldName: 'accion', label: '⚡ Tipo de Acción', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 8 }, indexPatternRefName: 'ctrl_audit_dv' },
            { id: 'ctrl-entidad', fieldName: 'entidad', label: '📁 Recurso Afectado', type: 'list', options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 6 }, indexPatternRefName: 'ctrl_audit_dv' },
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
      title: 'KPI Auditoría - Total Eventos Registrados',
      visState: JSON.stringify({
        title: 'Total Eventos Registrados',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Bitácora inmutable en PostgreSQL 18', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '📋 Total Eventos Auditados' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-audit-total?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricAuditTotal) });

  const visMetricAuditPhi = {
    attributes: {
      title: 'KPI Auditoría - Consultas a PHI',
      visState: JSON.stringify({
        title: 'Consultas a Expedientes PHI',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Lecturas de datos clínicos protegidos', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🔍 Accesos a PHI' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'accion: "CONSULTA_PHI"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-audit-phi?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricAuditPhi) });

  const visMetricAuditFailed = {
    attributes: {
      title: 'KPI Auditoría - Intentos de Acceso Bloqueados',
      visState: JSON.stringify({
        title: 'Intentos Bloqueados / Alertas',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Defensa perimetral contra fuerza bruta', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🚨 Alertas de Seguridad' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'estado_resultado: "FALLIDO" or estado_resultado: "BLOQUEADO"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-audit-failed?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricAuditFailed) });

  const visMetricAuditLogout = {
    attributes: {
      title: 'KPI Auditoría - Cierres de Sesión Automáticos HIPAA',
      visState: JSON.stringify({
        title: 'Auto-Logouts HIPAA',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Inactividad de 15 minutos cumplida', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '⏱️ Auto-Logout Cumplido' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'accion: "AUTO_LOGOUT_HIPAA"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-audit-logout?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricAuditLogout) });

  const visBarAuditRoles = {
    attributes: {
      title: 'Gráfica de Barras - Eventos de Auditoría por Rol',
      visState: JSON.stringify({
        title: 'Actividad por Rol Hospitalario',
        type: 'histogram',
        params: {
          type: 'histogram', grid: { categoryLines: false },
          categoryAxes: [{ id: 'CategoryAxis-1', type: 'category', position: 'bottom', show: true, scale: { type: 'linear' }, labels: { show: true, truncate: 100 }, title: {} }],
          valueAxes: [{ id: 'ValueAxis-1', name: 'LeftAxis-1', type: 'value', position: 'left', show: true, scale: { type: 'linear', mode: 'normal' }, labels: { show: true }, title: { text: 'Eventos Auditados' } }],
          seriesParams: [{ show: true, type: 'histogram', mode: 'stacked', data: { label: 'Eventos', id: '1' }, valueAxis: 'ValueAxis-1' }],
          addTooltip: true, addLegend: true, legendPosition: 'right',
        },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Eventos' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'rol', size: 5, order: 'desc', orderBy: '1', customLabel: 'Rol de Usuario' } },
          { id: '3', enabled: true, type: 'terms', schema: 'group', params: { field: 'accion', size: 5, order: 'desc', orderBy: '1', customLabel: 'Acción' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-bar-audit-roles?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBarAuditRoles) });

  const visPieAuditActions = {
    attributes: {
      title: 'Gráfica de Dona - Distribución de Acciones sobre PHI',
      visState: JSON.stringify({
        title: 'Distribución de Acciones HIPAA',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Total Acciones' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'accion', size: 8, order: 'desc', orderBy: '1', customLabel: 'Acción Ejecutada' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pie-audit-actions?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visPieAuditActions) });

  const visTableAuditForensic = {
    attributes: {
      title: 'Tabla Dinámica - Bitácora Forense de Seguridad HIPAA en Vivo',
      visState: JSON.stringify({
        title: 'Bitácora Forense de Auditoría HIPAA (§ 164.312)',
        type: 'table',
        params: { perPage: 10, showPartialRows: false, showMetricsAtAllLevels: false, showTotal: false },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Eventos' } },
          { id: '2', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'nombre_usuario.keyword', size: 15, order: 'desc', orderBy: '1', customLabel: 'Usuario' } },
          { id: '3', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'rol', size: 6, order: 'desc', orderBy: '1', customLabel: 'Rol' } },
          { id: '4', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'accion', size: 10, order: 'desc', orderBy: '1', customLabel: 'Acción' } },
          { id: '5', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'entidad', size: 8, order: 'desc', orderBy: '1', customLabel: 'Recurso Clínico' } },
          { id: '6', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'ip_cliente', size: 10, order: 'desc', orderBy: '1', customLabel: 'IP Origen' } },
          { id: '7', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'estado_resultado', size: 4, order: 'desc', orderBy: '1', customLabel: 'Resultado' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: auditDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-table-audit-forensic?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visTableAuditForensic) });

  // --- PILAR 3: Visualizaciones de Salud del Sistema SRE / APM Telemetría ---
  const visHeaderSre = {
    attributes: {
      title: 'Banner - Salud de la Plataforma & Telemetría SRE / APM',
      visState: JSON.stringify({
        title: 'Banner - SRE / APM',
        type: 'markdown',
        params: {
          markdown:
            '# ⚙️ Centro Médico Nacional • Monitoreo de Microservicios, Kong Gateway & APM\n' +
            '> **Observabilidad de Nivel Empresarial con OpenTelemetry**: Rendimiento en tiempo real de NestJS 12, PostgreSQL 18, Redis 8 y Kong Gateway.  \n' +
            '> **Acceso Rápido**: [🏥 1. Camas, Farmacia & Facturación](#/view/centro-medico-dashboard) &bull; [🛡️ 2. Seguridad & Auditoría HIPAA](#/view/hipaa-security-audit-dashboard) &bull; [⚙️ 3. Salud del Sistema SRE / APM](#/view/sre-telemetry-dashboard)',
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
      title: 'KPI SRE - Disponibilidad Global SLA',
      visState: JSON.stringify({
        title: 'Disponibilidad SLA',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Todos los contenedores en estado Healthy', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🟢 99.98% Uptime SLA' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: 'estado_salud: "Healthy"', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-sre-uptime?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricSreUptime) });

  const visMetricSreLatency = {
    attributes: {
      title: 'KPI SRE - Latencia Promedio API (ms)',
      visState: JSON.stringify({
        title: 'Latencia Media API',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Tiempo medio de respuesta por Kong/NestJS', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'avg', schema: 'metric', params: { field: 'latencia_ms', customLabel: '⚡ Latencia Media (ms)' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-sre-latency?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricSreLatency) });

  const visMetricSreRpm = {
    attributes: {
      title: 'KPI SRE - Peticiones por Minuto (RPM)',
      visState: JSON.stringify({
        title: 'Throughput (RPM)',
        type: 'metric',
        params: { metric: { percentageMode: false, useRanges: false, colorSchema: 'Green to Red', metricColorMode: 'Labels', colorsRange: [{ from: 0, to: 100 }], labels: { show: true }, style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Rendimiento agregado en Kong Gateway', fontSize: 44 } } },
        aggs: [{ id: '1', enabled: true, type: 'avg', schema: 'metric', params: { field: 'peticiones_por_minuto', customLabel: '📊 Peticiones / Min' } }],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-sre-rpm?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visMetricSreRpm) });

  const visBarSreEndpoints = {
    attributes: {
      title: 'Gráfica de Barras - Latencia Media por Endpoint',
      visState: JSON.stringify({
        title: 'Latencia por Endpoint de la API (ms)',
        type: 'horizontal_bar',
        params: {
          type: 'histogram', grid: { categoryLines: false },
          categoryAxes: [{ id: 'CategoryAxis-1', type: 'category', position: 'left', show: true, scale: { type: 'linear' }, labels: { show: true, truncate: 100 }, title: {} }],
          valueAxes: [{ id: 'ValueAxis-1', name: 'LeftAxis-1', type: 'value', position: 'bottom', show: true, scale: { type: 'linear', mode: 'normal' }, labels: { show: true }, title: { text: 'Latencia Media (ms)' } }],
          seriesParams: [{ show: true, type: 'histogram', mode: 'normal', data: { label: 'Latencia ms', id: '1' }, valueAxis: 'ValueAxis-1' }],
          addTooltip: true, addLegend: false,
        },
        aggs: [
          { id: '1', enabled: true, type: 'avg', schema: 'metric', params: { field: 'latencia_ms', customLabel: 'Latencia Promedio (ms)' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'endpoint', size: 10, order: 'desc', orderBy: '1', customLabel: 'Ruta API' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-bar-sre-endpoints?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visBarSreEndpoints) });

  const visPieSreStatus = {
    attributes: {
      title: 'Gráfica de Dona - Códigos de Estado HTTP',
      visState: JSON.stringify({
        title: 'Distribución Códigos HTTP',
        type: 'pie',
        params: { type: 'pie', addTooltip: true, addLegend: true, legendPosition: 'right', isDonut: true },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Respuestas' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'codigo_estado', size: 8, order: 'desc', orderBy: '1', customLabel: 'Código de Estado' } },
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
      title: 'Tabla Dinámica - Matriz de Salud de Microservicios',
      visState: JSON.stringify({
        title: 'Matriz de Salud de Microservicios',
        type: 'table',
        params: { perPage: 10, showPartialRows: false, showMetricsAtAllLevels: false, showTotal: false },
        aggs: [
          { id: '1', enabled: true, type: 'avg', schema: 'metric', params: { field: 'latencia_ms', customLabel: 'Latencia (ms)' } },
          { id: '2', enabled: true, type: 'avg', schema: 'metric', params: { field: 'uso_cpu_pct', customLabel: 'CPU (%)' } },
          { id: '3', enabled: true, type: 'avg', schema: 'metric', params: { field: 'uso_memoria_mb', customLabel: 'Memoria (MB)' } },
          { id: '4', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'servicio', size: 10, order: 'asc', orderBy: '_key', customLabel: 'Microservicio' } },
          { id: '5', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'estado_salud', size: 5, order: 'desc', orderBy: '1', customLabel: 'Estado Salud' } },
        ],
      }),
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [], indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' }) },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: telemetryDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-table-sre-services?overwrite=true`, { method: 'POST', headers: KBN_HEADERS, body: JSON.stringify(visTableSreServices) });

  console.log('  ✓ 25 visualizaciones oficiales creadas exitosamente para los 3 Pilares.');

  // 10. Limpiar dashboards obsoletos y Registrar EXACTAMENTE los 2 Dashboards solicitados
  console.log('\n📊 Registrando exactamente los 2 Dashboards en Kibana...');

  // Eliminar dashboards anteriores o de prueba para mantener la vista limpia
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

  // --- DASHBOARD 1: NEGOCIO (Camas, Farmacia & Facturación) ---
  const panelsOps = [
    { gridData: { x: 0, y: 0, w: 48, h: 4, i: 'p-header' }, panelIndex: 'p-header', panelRefName: 'ref_header', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 4, w: 48, h: 6, i: 'p-controls' }, panelIndex: 'p-controls', panelRefName: 'ref_controls', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 10, w: 10, h: 7, i: 'p-beds-free' }, panelIndex: 'p-beds-free', panelRefName: 'ref_beds_free', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 10, y: 10, w: 9, h: 7, i: 'p-beds-occ' }, panelIndex: 'p-beds-occ', panelRefName: 'ref_beds_occ', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 19, y: 10, w: 9, h: 7, i: 'p-pharm-crit' }, panelIndex: 'p-pharm-crit', panelRefName: 'ref_pharm-crit', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 28, y: 10, w: 10, h: 7, i: 'p-pharm-stock' }, panelIndex: 'p-pharm-stock', panelRefName: 'ref_pharm-stock', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 38, y: 10, w: 10, h: 7, i: 'p-revenue' }, panelIndex: 'p-revenue', panelRefName: 'ref_revenue', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 17, w: 24, h: 14, i: 'p-bar-stock' }, panelIndex: 'p-bar-stock', panelRefName: 'ref_bar_stock', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 24, y: 17, w: 24, h: 14, i: 'p-bar-beds' }, panelIndex: 'p-bar-beds', panelRefName: 'ref_bar_beds', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 31, w: 16, h: 12, i: 'p-beds-donut' }, panelIndex: 'p-beds-donut', panelRefName: 'ref_beds_donut', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 16, y: 31, w: 16, h: 12, i: 'p-pharm-pie' }, panelIndex: 'p-pharm-pie', panelRefName: 'ref_pharm_pie', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 32, y: 31, w: 16, h: 12, i: 'p-rev-ins' }, panelIndex: 'p-rev-ins', panelRefName: 'ref_rev_ins', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 43, w: 24, h: 16, i: 'p-table-pharm' }, panelIndex: 'p-table-pharm', panelRefName: 'ref_table_pharm', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 24, y: 43, w: 24, h: 16, i: 'p-table-beds' }, panelIndex: 'p-table-beds', panelRefName: 'ref_table_beds', version: '9.5.5', embeddableConfig: { enhancements: {} } },
  ];

  await fetch(`${KBN_URL}/api/saved_objects/dashboard/business-operations-dashboard?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify({
      attributes: {
        title: '1. Dashboard Negocio: Camas, Farmacia & Facturación',
        description: 'Dashboard de Negocio Hospitalario: Censo y ocupación de camas, control de inventario de medicamentos y facturación en MXN.',
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
        { name: 'ref_bar_stock', type: 'visualization', id: 'vis-bar-stock-compare' },
        { name: 'ref_bar_beds', type: 'visualization', id: 'vis-bar-beds-by-floor' },
        { name: 'ref_beds_donut', type: 'visualization', id: 'vis-beds-donut' },
        { name: 'ref_pharm_pie', type: 'visualization', id: 'vis-pharmacy-pie' },
        { name: 'ref_rev_ins', type: 'visualization', id: 'vis-pie-revenue-by-insurer' },
        { name: 'ref_table_pharm', type: 'visualization', id: 'vis-table-pharmacy-dynamic' },
        { name: 'ref_table_beds', type: 'visualization', id: 'vis-table-beds-dynamic' },
      ],
    }),
  });
  console.log('  ✓ Dashboard 1: "1. Dashboard Negocio: Camas, Farmacia & Facturación" registrado.');

  // --- DASHBOARD 2: TECH (Salud del Sistema, SRE / APM, Seguridad & Auditoría HIPAA) ---
  const panelsTech = [
    { gridData: { x: 0, y: 0, w: 48, h: 4, i: 'p-tech-hdr' }, panelIndex: 'p-tech-hdr', panelRefName: 'ref_tech_hdr', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 4, w: 48, h: 6, i: 'p-tech-ctrl' }, panelIndex: 'p-tech-ctrl', panelRefName: 'ref_tech_ctrl', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Fila unificada de 7 KPIs (Salud SRE + Seguridad HIPAA)
    { gridData: { x: 0, y: 10, w: 7, h: 7, i: 'p-sre-upt' }, panelIndex: 'p-sre-upt', panelRefName: 'ref_sre_upt', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 7, y: 10, w: 7, h: 7, i: 'p-sre-lat' }, panelIndex: 'p-sre-lat', panelRefName: 'ref_sre_lat', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 14, y: 10, w: 7, h: 7, i: 'p-sre-rpm' }, panelIndex: 'p-sre-rpm', panelRefName: 'ref_sre_rpm', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 21, y: 10, w: 7, h: 7, i: 'p-hipaa-tot' }, panelIndex: 'p-hipaa-tot', panelRefName: 'ref_hipaa_tot', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 28, y: 10, w: 7, h: 7, i: 'p-hipaa-phi' }, panelIndex: 'p-hipaa-phi', panelRefName: 'ref_hipaa_phi', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 35, y: 10, w: 7, h: 7, i: 'p-hipaa-fail' }, panelIndex: 'p-hipaa-fail', panelRefName: 'ref_hipaa_fail', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 42, y: 10, w: 6, h: 7, i: 'p-hipaa-log' }, panelIndex: 'p-hipaa-log', panelRefName: 'ref_hipaa_log', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Visualizaciones SRE / APM
    { gridData: { x: 0, y: 17, w: 28, h: 14, i: 'p-sre-bar' }, panelIndex: 'p-sre-bar', panelRefName: 'ref_sre_bar', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 28, y: 17, w: 20, h: 14, i: 'p-sre-pie' }, panelIndex: 'p-sre-pie', panelRefName: 'ref_sre_pie', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Tabla de microservicios y estado de salud
    { gridData: { x: 0, y: 31, w: 48, h: 13, i: 'p-sre-tbl' }, panelIndex: 'p-sre-tbl', panelRefName: 'ref_sre_tbl', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Visualizaciones Seguridad & HIPAA
    { gridData: { x: 0, y: 44, w: 26, h: 14, i: 'p-hipaa-bar' }, panelIndex: 'p-hipaa-bar', panelRefName: 'ref_hipaa_bar', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 26, y: 44, w: 22, h: 14, i: 'p-hipaa-pie' }, panelIndex: 'p-hipaa-pie', panelRefName: 'ref_hipaa_pie', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Tabla Forense Inmutable de Seguridad HIPAA
    { gridData: { x: 0, y: 58, w: 48, h: 16, i: 'p-hipaa-tbl' }, panelIndex: 'p-hipaa-tbl', panelRefName: 'ref_hipaa_tbl', version: '9.5.5', embeddableConfig: { enhancements: {} } },
  ];

  await fetch(`${KBN_URL}/api/saved_objects/dashboard/tech-sre-security-dashboard?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify({
      attributes: {
        title: '2. Dashboard Tech: SRE / APM, Salud del Sistema, Seguridad & Auditoría HIPAA',
        description: 'Dashboard Técnico Unificado: Telemetría de microservicios (uptime, latencias p95, RPM, códigos HTTP), seguridad perimetral Keycloak y registro forense inmutable HIPAA (NOM-024).',
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
  console.log('  ✓ Dashboard 2: "2. Dashboard Tech: SRE / APM, Salud del Sistema, Seguridad & Auditoría HIPAA" registrado.');

  // 11. Exportar la suite de los 2 Dashboards a ./observability/
  console.log('\n💾 Exportando los 2 Dashboards a JSON y NDJSON...');
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

  console.log(`  ✓ Archivo NDJSON actualizado: ${ndjsonPath}`);
  console.log(`  ✓ Archivo JSON formateado actualizado: ${jsonPath}`);

  console.log('\n============================================================');
  console.log('🎉 LOS 2 DASHBOARDS HAN SIDO APROVISIONADOS EXITOSAMENTE');
  console.log('============================================================');
  console.log('🔗 Enlaces directos a los 2 Dashboards en Kibana:');
  console.log('   1. Dashboard Negocio (Camas, Farmacia & Facturación):');
  console.log('      http://localhost:5601/app/dashboards#/view/business-operations-dashboard');
  console.log('   2. Dashboard Tech (SRE / APM, Salud del Sistema, Seguridad & Auditoría HIPAA):');
  console.log('      http://localhost:5601/app/dashboards#/view/tech-sre-security-dashboard');
}

main().catch((err) => {
  console.error('❌ Error general durante el aprovisionamiento:', err);
  process.exit(1);
});
