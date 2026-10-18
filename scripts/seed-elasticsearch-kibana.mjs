// scripts/seed-elasticsearch-kibana.mjs
// Aprovisionamiento integral de Índices, Documentos, Data Views, Visualizaciones y Dashboard de Kibana 9.5.5
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
  console.log('🚀 Iniciando aprovisionamiento de Elasticsearch y Kibana 9.5.5...');

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
  console.log('\n📦 Creando índices en Elasticsearch...');

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
          monto_mxn: { type: 'float' },
          copago_mxn: { type: 'float' },
          '@timestamp': { type: 'date' },
        },
      },
    }),
  });
  console.log(`  ✓ Índice ${opsIndex} creado`);

  // 3. Poblar Medicamentos (Farmacia Hospitalaria)
  console.log('\n💊 Indexando catálogo de fármacos y stock...');
  const now = new Date().toISOString();

  const medications = [
    { id: 'MED-001', comercial: 'Tempra Forte', activo: 'Paracetamol', cat: 'Analgésicos y Antipiréticos', pres: 'Tabletas 500mg (Caja c/20)', lote: 'L-2026A-01', cad: '2027-08-30', stock: 850, min: 200, max: 1000, alerta: 'Normal', almacen: 'Farmacia Central', precio: 85.0 },
    { id: 'MED-002', comercial: 'Dolac Inyectable', activo: 'Ketorolaco Trometamina', cat: 'Analgésicos y Antipiréticos', pres: 'Ampolleta 30mg/ml', lote: 'L-2026A-02', cad: '2027-04-15', stock: 135, min: 100, max: 400, alerta: 'Normal', almacen: 'Urgencias', precio: 145.0 },
    { id: 'MED-003', comercial: 'Tramal 50mg', activo: 'Clorhidrato de Tramadol', cat: 'Analgésicos y Antipiréticos', pres: 'Cápsulas 50mg', lote: 'L-2026B-05', cad: '2026-12-15', stock: 45, min: 50, max: 200, alerta: 'Bajo', almacen: 'Farmacia Central', precio: 210.0 },
    { id: 'MED-004', comercial: 'Morfina Solución IV', activo: 'Sulfato de Morfina', cat: 'Analgésicos Controlados UCI', pres: 'Ampolleta 10mg/ml', lote: 'L-2026C-09', cad: '2027-02-28', stock: 12, min: 30, max: 100, alerta: 'Crítico', almacen: 'Terapia Intensiva (UTI)', precio: 380.0 },
    { id: 'MED-005', comercial: 'Augmentin 875', activo: 'Amoxicilina / Ácido Clavulánico', cat: 'Antibióticos y Antimicrobianos', pres: 'Tabletas 875/125mg', lote: 'L-2026A-12', cad: '2027-11-20', stock: 320, min: 150, max: 600, alerta: 'Normal', almacen: 'Farmacia Central', precio: 495.0 },
    { id: 'MED-006', comercial: 'Rocephin 1g', activo: 'Ceftriaxona Disódica', cat: 'Antibióticos y Antimicrobianos', pres: 'Frasco Ámpula 1g IV', lote: 'L-2026A-18', cad: '2027-06-30', stock: 68, min: 80, max: 300, alerta: 'Bajo', almacen: 'Urgencias', precio: 360.0 },
    { id: 'MED-007', comercial: 'Merrem 1g', activo: 'Meropenem Trihidratado', cat: 'Antibióticos y Antimicrobianos', pres: 'Frasco Ámpula 1g IV', lote: 'L-2026D-01', cad: '2027-01-10', stock: 14, min: 40, max: 150, alerta: 'Crítico', almacen: 'Terapia Intensiva (UTI)', precio: 1250.0 },
    { id: 'MED-008', comercial: 'Ciproxina 500', activo: 'Ciprofloxacino Clorhidrato', cat: 'Antibióticos y Antimicrobianos', pres: 'Tabletas 500mg', lote: 'L-2026A-22', cad: '2028-03-15', stock: 240, min: 100, max: 500, alerta: 'Normal', almacen: 'Farmacia Central', precio: 290.0 },
    { id: 'MED-009', comercial: 'Cozaar 50mg', activo: 'Losartán Potásico', cat: 'Cardiología y Antihipertensivos', pres: 'Comprimidos 50mg (c/30)', lote: 'L-2026B-02', cad: '2028-05-10', stock: 580, min: 200, max: 800, alerta: 'Normal', almacen: 'Farmacia Central', precio: 310.0 },
    { id: 'MED-010', comercial: 'Norvasc 5mg', activo: 'Besilato de Amlodipino', cat: 'Cardiología y Antihipertensivos', pres: 'Tabletas 5mg (c/30)', lote: 'L-2026B-08', cad: '2027-09-18', stock: 420, min: 150, max: 600, alerta: 'Normal', almacen: 'Farmacia Central', precio: 380.0 },
    { id: 'MED-011', comercial: 'Seloken ZOK 100', activo: 'Succinato de Metoprolol', cat: 'Cardiología y Antihipertensivos', pres: 'Tabletas 100mg (c/20)', lote: 'L-2026B-14', cad: '2027-10-05', stock: 290, min: 100, max: 400, alerta: 'Normal', almacen: 'Farmacia Central', precio: 420.0 },
    { id: 'MED-012', comercial: 'Glucophage 850', activo: 'Metformina Clorhidrato', cat: 'Endocrinología y Diabetes', pres: 'Tabletas 850mg (c/40)', lote: 'L-2026C-03', cad: '2028-01-20', stock: 640, min: 200, max: 900, alerta: 'Normal', almacen: 'Farmacia Central', precio: 260.0 },
    { id: 'MED-013', comercial: 'Lantus Solostar', activo: 'Insulina Glargina 100 UI/ml', cat: 'Endocrinología y Diabetes', pres: 'Pluma prellenada 3ml', lote: 'L-2026C-11', cad: '2026-11-30', stock: 24, min: 40, max: 120, alerta: 'Bajo', almacen: 'Farmacia Central (Refrigerada)', precio: 980.0 },
    { id: 'MED-014', comercial: 'Humalog KwikPen', activo: 'Insulina Lispro Rápida', cat: 'Endocrinología y Diabetes', pres: 'Pluma prellenada 3ml', lote: 'L-2026C-19', cad: '2026-12-05', stock: 16, min: 35, max: 100, alerta: 'Crítico', almacen: 'Farmacia Central (Refrigerada)', precio: 890.0 },
    { id: 'MED-015', comercial: 'Losec IV 40mg', activo: 'Omeprazol Sódico', cat: 'Gastroenterología y Antiulcerosos', pres: 'Frasco Ámpula 40mg IV', lote: 'L-2026D-04', cad: '2027-07-22', stock: 180, min: 80, max: 400, alerta: 'Normal', almacen: 'Piso Quirófano', precio: 165.0 },
    { id: 'MED-016', comercial: 'Clexane 40mg', activo: 'Enoxaparina Sódica', cat: 'Anticoagulantes y Hematología', pres: 'Jeringa prellenada 40mg/0.4ml', lote: 'L-2026D-12', cad: '2026-11-15', stock: 32, min: 50, max: 180, alerta: 'Bajo', almacen: 'Urgencias', precio: 490.0 },
    { id: 'MED-017', comercial: 'Ventolin Aerosol', activo: 'Sulfato de Salbutamol', cat: 'Neumología y Vías Respiratorias', pres: 'Inhalador 100mcg/dosis (200 dosis)', lote: 'L-2026E-01', cad: '2027-12-10', stock: 95, min: 50, max: 200, alerta: 'Normal', almacen: 'Urgencias', precio: 215.0 },
    { id: 'MED-018', comercial: 'Alin Inyectable', activo: 'Dexametasona Fosfato', cat: 'Corticosteroides y Antiinflamatorios', pres: 'Ampolleta 8mg/2ml', lote: 'L-2026E-07', cad: '2027-09-15', stock: 110, min: 60, max: 300, alerta: 'Normal', almacen: 'Farmacia Central', precio: 95.0 },
    { id: 'MED-019', comercial: 'Solución Fisiológica 0.9%', activo: 'Cloruro de Sodio 0.9%', cat: 'Soluciones Intravenosas y Cristaloides', pres: 'Bolsa Flexoval 1000ml', lote: 'L-2026F-25', cad: '2028-06-30', stock: 1450, min: 400, max: 2000, alerta: 'Normal', almacen: 'Almacén General de Sueros', precio: 65.0 },
    { id: 'MED-020', comercial: 'Fentanilo Inyectable', activo: 'Citrato de Fentanilo', cat: 'Analgésicos Controlados UCI', pres: 'Ampolleta 0.5mg/10ml', lote: 'L-2026G-02', cad: '2026-10-30', stock: 8, min: 25, max: 80, alerta: 'Crítico', almacen: 'Terapia Intensiva (UTI)', precio: 520.0 },
  ];

  let bulkMed = '';
  for (const m of medications) {
    bulkMed += JSON.stringify({ index: { _index: pharmacyIndex, _id: m.id } }) + '\n';
    bulkMed += JSON.stringify({
      medicamento_id: m.id,
      nombre_comercial: m.comercial,
      principio_activo: m.activo,
      categoria_terapeutica: m.cat,
      presentacion: m.pres,
      lote: m.lote,
      caducidad: m.cad,
      stock_actual: m.stock,
      stock_minimo: m.min,
      stock_maximo: m.max,
      nivel_alerta: m.alerta,
      ubicacion_almacen: m.almacen,
      precio_unitario_mxn: m.precio,
      costo_total_inventario_mxn: Math.round(m.stock * m.precio * 100) / 100,
      '@timestamp': now,
    }) + '\n';
  }

  await fetch(`${ES_URL}/_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body: bulkMed,
  });
  console.log(`  ✓ ${medications.length} medicamentos indexados en ${pharmacyIndex}`);

  // 4. Poblar Censo de Camas Hospitalarias
  console.log('\n🛏️ Indexando censo de camas hospitalarias...');
  const beds = [
    { id: 'BED-101', num: '101', piso: 1, tipo: 'Habitación Privada', estado: 'Disponible', tarifa: 4500.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-102', num: '102', piso: 1, tipo: 'Habitación Compartida', estado: 'Ocupada', tarifa: 3200.0, paciente: 'Carlos Méndez Ruiz', dni: '32145890', doc: 'Dr. Héctor Morales', dias: 3 },
    { id: 'BED-103', num: '103', piso: 1, tipo: 'Habitación Compartida', estado: 'Disponible', tarifa: 3200.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-104', num: '104', piso: 1, tipo: 'Habitación Privada', estado: 'Ocupada', tarifa: 4500.0, paciente: 'María Luisa Domínguez', dni: '19874563', doc: 'Dra. Gabriela Solís', dias: 2 },
    { id: 'BED-105', num: '105', piso: 1, tipo: 'Habitación Compartida', estado: 'En Sanitización / Mantenimiento', tarifa: 3200.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-106', num: '106', piso: 1, tipo: 'Habitación Privada', estado: 'Disponible', tarifa: 4500.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-201', num: '201', piso: 2, tipo: 'Suite Hospitalaria', estado: 'Ocupada', tarifa: 7800.0, paciente: 'Juan Pérez García', dni: '28456123', doc: 'Dr. Rafael Castelo', dias: 1 },
    { id: 'BED-202', num: '202', piso: 2, tipo: 'Habitación Privada', estado: 'Disponible', tarifa: 5200.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-203', num: '203', piso: 2, tipo: 'Habitación Privada', estado: 'Ocupada', tarifa: 5200.0, paciente: 'Roberto Gómez Valdez', dni: '45678912', doc: 'Dr. Fernando Navarro', dias: 4 },
    { id: 'BED-204', num: '204', piso: 2, tipo: 'Suite Hospitalaria', estado: 'Disponible', tarifa: 7800.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-205', num: '205', piso: 2, tipo: 'Habitación Privada', estado: 'Disponible', tarifa: 5200.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-301', num: '301', piso: 3, tipo: 'Terapia Intensiva (UTI)', estado: 'Ocupada', tarifa: 14500.0, paciente: 'Eduardo Garza Silva', dni: '15487963', doc: 'Dr. Javier Villalobos', dias: 6 },
    { id: 'BED-302', num: '302', piso: 3, tipo: 'Terapia Intensiva (UTI)', estado: 'Disponible', tarifa: 14500.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-303', num: '303', piso: 3, tipo: 'Aislamiento Infeccioso', estado: 'Ocupada', tarifa: 9800.0, paciente: 'Carmen Ortiz Vega', dni: '22365478', doc: 'Dra. Verónica Peña', dias: 5 },
    { id: 'BED-304', num: '304', piso: 3, tipo: 'Terapia Intensiva (UTI)', estado: 'En Sanitización / Mantenimiento', tarifa: 14500.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-Q01', num: 'Q-01', piso: 0, tipo: 'Quirófano Central', estado: 'Ocupada', tarifa: 18000.0, paciente: 'Fernando Castro Ríos', dni: '38974512', doc: 'Dr. Arturo Beltrán', dias: 1 },
    { id: 'BED-Q02', num: 'Q-02', piso: 0, tipo: 'Quirófano Ambulatorio', estado: 'Disponible', tarifa: 12000.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-REC', num: 'REC-01', piso: 0, tipo: 'Unidad de Recuperación Post-Anestesia', estado: 'Disponible', tarifa: 3500.0, paciente: null, dni: null, doc: null, dias: 0 },
  ];

  let bulkBeds = '';
  for (const b of beds) {
    bulkBeds += JSON.stringify({ index: { _index: bedsIndex, _id: b.id } }) + '\n';
    bulkBeds += JSON.stringify({
      cama_id: b.id,
      numero: b.num,
      piso: b.piso,
      tipo: b.tipo,
      estado: b.estado,
      tarifa_noche_mxn: b.tarifa,
      paciente_nombre: b.paciente,
      paciente_dni: b.dni,
      medico_responsable: b.doc,
      dias_estancia: b.dias,
      costo_acumulado_mxn: Math.round(b.tarifa * Math.max(1, b.dias) * 100) / 100,
      '@timestamp': now,
    }) + '\n';
  }

  await fetch(`${ES_URL}/_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body: bulkBeds,
  });
  console.log(`  ✓ ${beds.length} camas hospitalarias indexadas en ${bedsIndex}`);

  // 5. Poblar Operaciones Clínicas
  console.log('\n📊 Indexando transacciones de operaciones clínicas...');
  const specialties = ['Cardiología', 'Pediatría', 'Cirugía General', 'Medicina Interna', 'Traumatología y Ortopedia'];
  const doctors = ['Dr. Rafael Castelo', 'Dra. Gabriela Solís', 'Dr. Héctor Morales', 'Dra. Verónica Peña', 'Dr. Arturo Beltrán'];
  const insurers = ['GNP Seguros', 'MetLife México', 'AXA Seguros', 'Seguros Monterrey', 'Particular'];
  const statuses = ['atendido', 'confirmado', 'programado', 'cancelado'];

  let bulkOps = '';
  for (let i = 1; i <= 50; i++) {
    const spec = specialties[i % specialties.length];
    const doc = doctors[i % doctors.length];
    const ins = insurers[i % insurers.length];
    const st = statuses[i % statuses.length];
    const baseMonto = 950 + (i % 5) * 450;
    const copay = ins === 'Particular' ? baseMonto : Math.round(baseMonto * 0.15);
    const dateOffset = (i % 7) * 86400000;
    const eventTime = new Date(Date.now() - dateOffset).toISOString();

    bulkOps += JSON.stringify({ index: { _index: opsIndex, _id: `OP-${1000 + i}` } }) + '\n';
    bulkOps += JSON.stringify({
      operacion_id: `OP-${1000 + i}`,
      tipo_evento: i % 4 === 0 ? 'hospitalizacion' : 'consulta_especialidad',
      especialidad: spec,
      medico: doc,
      paciente: `Paciente de Registro #${i}`,
      estado: st,
      aseguradora: ins,
      monto_mxn: baseMonto,
      copago_mxn: copay,
      '@timestamp': eventTime,
    }) + '\n';
  }

  await fetch(`${ES_URL}/_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body: bulkOps,
  });
  console.log(`  ✓ 50 eventos clínicos indexados en ${opsIndex}`);

  await fetch(`${ES_URL}/${pharmacyIndex},${bedsIndex},${opsIndex}/_refresh`, { method: 'POST' });

  // 6. Configurar Data Views con IDs deterministas tanto en Saved Objects como en Data Views
  console.log('\n👁️ Configurando Data Views deterministas en Kibana...');
  const pharmacyDvId = 'healthtech-pharmacy-dv';
  const bedsDvId = 'healthtech-beds-dv';
  const opsDvId = 'healthtech-ops-dv';

  const dataViews = [
    {
      id: pharmacyDvId,
      title: 'healthtech-pharmacy-stock*',
      name: 'Farmacia - Stock y Alertas de Medicamentos',
      timeFieldName: '@timestamp',
    },
    {
      id: bedsDvId,
      title: 'healthtech-beds-census*',
      name: 'Censo de Camas y Ocupación Hospitalaria',
      timeFieldName: '@timestamp',
    },
    {
      id: opsDvId,
      title: 'healthtech-clinical-operations*',
      name: 'Operaciones Clínicas y Consultas',
      timeFieldName: '@timestamp',
    },
  ];

  for (const dv of dataViews) {
    // Registrar directamente como Saved Object de tipo index-pattern
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
    console.log(`  ✓ Data View "${dv.name}" registrado con ID: ${dv.id}`);
  }

  // 7. Crear Visualizaciones Oficiales de Kibana (100% Dinámicas e Interactivas)
  console.log('\n🎨 Creando Visualizaciones Oficiales de Kibana (100% Dinámicas e Interactivas)...');

  // Vis 1: Encabezado Ejecutivo Hospitalario
  const visHeader = {
    attributes: {
      title: 'Encabezado - Centro Médico Nacional',
      visState: JSON.stringify({
        title: 'Encabezado - Centro Médico Nacional',
        type: 'markdown',
        params: {
          markdown:
            '# 🏥 Centro Médico Nacional • Centro de Control Hospitalario en Tiempo Real\n' +
            '> **Sistema de Monitoreo Clínico & Farmacéutico**: Todos los paneles calculan métricas en vivo consultando los índices de Elasticsearch. Usa los filtros interactivos inferiores para desglosar por **Piso Hospitalario**, **Alerta de Medicamento** o **Categoría Terapéutica** conforme a **NOM-004** y **NOM-024**.',
        },
      }),
      uiStateJSON: '{}',
      description: 'Encabezado ejecutivo interactivo',
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-header?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visHeader),
  });

  // Vis 2: Barra de Filtros Interactivos Globales (Input Control Vis)
  const visControls = {
    attributes: {
      title: 'Filtros Dinámicos - Piso, Alerta y Categoría',
      uiStateJSON: '{}',
      description: 'Filtros interactivos multiselección para filtrar en vivo todo el dashboard',
      visState: JSON.stringify({
        title: 'Filtros Dinámicos del Hospital',
        type: 'input_control_vis',
        params: {
          controls: [
            {
              id: 'ctrl-piso',
              fieldName: 'piso',
              label: '🏢 Filtrar por Piso Hospitalario',
              type: 'list',
              options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 5 },
              indexPatternRefName: 'ctrl_piso_dv',
            },
            {
              id: 'ctrl-alerta',
              fieldName: 'nivel_alerta',
              label: '🚨 Nivel de Alerta de Fármacos',
              type: 'list',
              options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 5 },
              indexPatternRefName: 'ctrl_alerta_dv',
            },
            {
              id: 'ctrl-cat',
              fieldName: 'categoria_terapeutica',
              label: '💊 Categoría Terapéutica',
              type: 'list',
              options: { type: 'terms', multiselect: true, dynamicOptions: true, size: 10 },
              indexPatternRefName: 'ctrl_cat_dv',
            },
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
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-controls-filter?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visControls),
  });

  // Vis 3: KPI Dinámico - Camas Libres en Tiempo Real
  const visMetricBedsFree = {
    attributes: {
      title: 'KPI Dinámico - Camas Libres',
      uiStateJSON: '{}',
      description: 'Conteo en tiempo real de camas con estado Disponible',
      visState: JSON.stringify({
        title: 'Camas Libres',
        type: 'metric',
        params: {
          metric: {
            percentageMode: false,
            useRanges: false,
            colorSchema: 'Green to Red',
            metricColorMode: 'Labels',
            colorsRange: [{ from: 0, to: 100 }],
            labels: { show: true },
            style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Disponibles para asignación inmediata', fontSize: 44 },
          },
        },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🟢 Camas Libres' } }],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: 'estado: "Disponible"', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-beds-free?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visMetricBedsFree),
  });

  // Vis 4: KPI Dinámico - Camas Ocupadas
  const visMetricBedsOcc = {
    attributes: {
      title: 'KPI Dinámico - Camas Ocupadas',
      uiStateJSON: '{}',
      description: 'Conteo en tiempo real de camas con pacientes asignados',
      visState: JSON.stringify({
        title: 'Camas Ocupadas',
        type: 'metric',
        params: {
          metric: {
            percentageMode: false,
            useRanges: false,
            colorSchema: 'Green to Red',
            metricColorMode: 'Labels',
            colorsRange: [{ from: 0, to: 100 }],
            labels: { show: true },
            style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Pacientes en internación activa', fontSize: 44 },
          },
        },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🔴 Camas Ocupadas' } }],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: 'estado: "Ocupada"', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-beds-occupied?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visMetricBedsOcc),
  });

  // Vis 5: KPI Dinámico - Fármacos en Alerta Crítica
  const visMetricPharmCrit = {
    attributes: {
      title: 'KPI Dinámico - Fármacos en Alerta Crítica',
      uiStateJSON: '{}',
      description: 'Conteo en vivo de fármacos con stock por debajo del mínimo',
      visState: JSON.stringify({
        title: 'Alerta Crítica',
        type: 'metric',
        params: {
          metric: {
            percentageMode: false,
            useRanges: false,
            colorSchema: 'Green to Red',
            metricColorMode: 'Labels',
            colorsRange: [{ from: 0, to: 100 }],
            labels: { show: true },
            style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Líneas que requieren reposición urgente', fontSize: 44 },
          },
        },
        aggs: [{ id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: '🚨 Fármacos Críticos' } }],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: 'nivel_alerta: "CRITICO"', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-pharm-critical?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visMetricPharmCrit),
  });

  // Vis 6: KPI Dinámico - Total Unidades de Medicamentos en Stock
  const visMetricPharmStock = {
    attributes: {
      title: 'KPI Dinámico - Total Stock Fármacos',
      uiStateJSON: '{}',
      description: 'Suma agregada de unidades de medicamentos en almacenes',
      visState: JSON.stringify({
        title: 'Total Unidades Stock',
        type: 'metric',
        params: {
          metric: {
            percentageMode: false,
            useRanges: false,
            colorSchema: 'Green to Red',
            metricColorMode: 'Labels',
            colorsRange: [{ from: 0, to: 100 }],
            labels: { show: true },
            style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Unidades totales en Farmacia Central y Almacenes', fontSize: 44 },
          },
        },
        aggs: [{ id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'stock_actual', customLabel: '📦 Unidades en Almacén' } }],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: '', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-pharm-stock-sum?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visMetricPharmStock),
  });

  // Vis 7: KPI Dinámico - Facturación Hospitalaria MXN
  const visMetricRevenue = {
    attributes: {
      title: 'KPI Dinámico - Facturación Clínica MXN',
      uiStateJSON: '{}',
      description: 'Recaudación total agregada en tiempo real',
      visState: JSON.stringify({
        title: 'Facturación Hospitalaria',
        type: 'metric',
        params: {
          metric: {
            percentageMode: false,
            useRanges: false,
            colorSchema: 'Green to Red',
            metricColorMode: 'Labels',
            colorsRange: [{ from: 0, to: 100 }],
            labels: { show: true },
            style: { bgFill: '#000', bgColor: false, labelColor: false, subText: 'Ingresos por consultas, hospitalización y procedimientos', fontSize: 44 },
          },
        },
        aggs: [{ id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'monto_total_mxn', customLabel: '💵 Recaudación Total (MXN)' } }],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: '', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: opsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-metric-revenue?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visMetricRevenue),
  });

  // Vis 8: Gráfica de Barras Horizontales - Comparativa Stock Actual vs Mínimo por Fármaco
  const visBarStock = {
    attributes: {
      title: 'Gráfica de Barras - Stock Actual vs Mínimo por Fármaco',
      uiStateJSON: '{}',
      description: 'Comparativa visual en tiempo real de existencias vs límite de seguridad',
      visState: JSON.stringify({
        title: 'Comparativa de Existencias: Stock Actual vs Mínimo',
        type: 'horizontal_bar',
        params: {
          type: 'histogram',
          grid: { categoryLines: false },
          categoryAxes: [
            {
              id: 'CategoryAxis-1',
              type: 'category',
              position: 'left',
              show: true,
              style: {},
              scale: { type: 'linear' },
              labels: { show: true, truncate: 100 },
              title: {},
            },
          ],
          valueAxes: [
            {
              id: 'ValueAxis-1',
              name: 'LeftAxis-1',
              type: 'value',
              position: 'bottom',
              show: true,
              style: {},
              scale: { type: 'linear', mode: 'normal' },
              labels: { show: true, rotate: 0, filter: false, truncate: 100 },
              title: { text: 'Unidades de Medicamento' },
            },
          ],
          seriesParams: [
            {
              show: true,
              type: 'histogram',
              mode: 'normal',
              data: { label: 'Stock Actual', id: '1' },
              valueAxis: 'ValueAxis-1',
              drawLinesBetweenPoints: true,
              showCircles: true,
            },
            {
              show: true,
              type: 'histogram',
              mode: 'normal',
              data: { label: 'Stock Mínimo Requerido', id: '2' },
              valueAxis: 'ValueAxis-1',
              drawLinesBetweenPoints: true,
              showCircles: true,
            },
          ],
          addTooltip: true,
          addLegend: true,
          legendPosition: 'top',
        },
        aggs: [
          { id: '1', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_actual', customLabel: 'Stock Actual' } },
          { id: '2', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_minimo', customLabel: 'Stock Mínimo Requerido' } },
          { id: '3', enabled: true, type: 'terms', schema: 'segment', params: { field: 'medicamento', size: 12, order: 'asc', orderBy: '1', customLabel: 'Medicamento' } },
        ],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: '', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-bar-stock-compare?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visBarStock),
  });

  // Vis 9: Gráfica de Barras Apiladas - Censo de Camas por Piso y Estado
  const visBarBeds = {
    attributes: {
      title: 'Gráfica de Barras Apiladas - Camas por Piso y Estado',
      uiStateJSON: '{}',
      description: 'Censo hospitalario por piso desglosando disponibilidad y ocupación',
      visState: JSON.stringify({
        title: 'Camas por Piso y Estado de Ocupación',
        type: 'histogram',
        params: {
          type: 'histogram',
          grid: { categoryLines: false },
          categoryAxes: [
            {
              id: 'CategoryAxis-1',
              type: 'category',
              position: 'bottom',
              show: true,
              style: {},
              scale: { type: 'linear' },
              labels: { show: true, truncate: 100 },
              title: {},
            },
          ],
          valueAxes: [
            {
              id: 'ValueAxis-1',
              name: 'LeftAxis-1',
              type: 'value',
              position: 'left',
              show: true,
              style: {},
              scale: { type: 'linear', mode: 'normal' },
              labels: { show: true, rotate: 0, filter: false, truncate: 100 },
              title: { text: 'Cantidad de Camas' },
            },
          ],
          seriesParams: [
            {
              show: true,
              type: 'histogram',
              mode: 'stacked',
              data: { label: 'Cantidad de Camas', id: '1' },
              valueAxis: 'ValueAxis-1',
              drawLinesBetweenPoints: true,
              showCircles: true,
            },
          ],
          addTooltip: true,
          addLegend: true,
          legendPosition: 'right',
        },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Cantidad de Camas' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'piso', size: 5, order: 'asc', orderBy: '_key', customLabel: 'Piso Hospitalario' } },
          { id: '3', enabled: true, type: 'terms', schema: 'group', params: { field: 'estado', size: 5, order: 'desc', orderBy: '1', customLabel: 'Estado' } },
        ],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: '', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-bar-beds-by-floor?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visBarBeds),
  });

  // Vis 10: Gráfica de Dona - Censo de Camas por Estado
  const visBedsDonut = {
    attributes: {
      title: 'Gráfica de Dona - Censo de Camas por Estado',
      uiStateJSON: '{}',
      description: 'Distribución porcentual de camas disponibles vs ocupadas',
      visState: JSON.stringify({
        title: 'Proporción de Camas por Estado',
        type: 'pie',
        params: {
          type: 'pie',
          addTooltip: true,
          addLegend: true,
          legendPosition: 'right',
          isDonut: true,
        },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Número de Camas' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'estado', size: 5, order: 'desc', orderBy: '1', customLabel: 'Estado de Ocupación' } },
        ],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: '', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-beds-donut?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visBedsDonut),
  });

  // Vis 11: Gráfica de Dona - Stock por Categoría Terapéutica
  const visPharmacyPie = {
    attributes: {
      title: 'Gráfica de Dona - Stock por Categoría Terapéutica',
      uiStateJSON: '{}',
      description: 'Unidades de fármacos por categoría terapéutica',
      visState: JSON.stringify({
        title: 'Stock por Categoría Terapéutica',
        type: 'pie',
        params: {
          type: 'pie',
          addTooltip: true,
          addLegend: true,
          legendPosition: 'right',
          isDonut: true,
        },
        aggs: [
          { id: '1', enabled: true, type: 'sum', schema: 'metric', params: { field: 'stock_actual', customLabel: 'Total Unidades Stock' } },
          { id: '2', enabled: true, type: 'terms', schema: 'segment', params: { field: 'categoria_terapeutica', size: 10, order: 'desc', orderBy: '1', customLabel: 'Categoría Terapéutica' } },
        ],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: '', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pharmacy-pie?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visPharmacyPie),
  });

  // Vis 12: Tabla Dinámica e Interactiva - Semáforo de Fármacos Críticos
  const visPharmacyTable = {
    attributes: {
      title: 'Tabla Dinámica - Inventario de Fármacos y Semáforo de Alertas',
      uiStateJSON: '{}',
      description: 'Tabla agregada con ordenamiento, búsqueda y semáforo de inventario',
      visState: JSON.stringify({
        title: 'Inventario Dinámico de Medicamentos',
        type: 'table',
        params: {
          perPage: 10,
          showPartialRows: false,
          showMetricsAtAllLevels: false,
          sort: { columnIndex: null, direction: null },
          showTotal: true,
          totalFunc: 'sum',
          percentageCol: '',
        },
        aggs: [
          { id: '1', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_actual', customLabel: 'Stock Actual' } },
          { id: '2', enabled: true, type: 'max', schema: 'metric', params: { field: 'stock_minimo', customLabel: 'Stock Mínimo' } },
          { id: '3', enabled: true, type: 'avg', schema: 'metric', params: { field: 'precio_unitario_mxn', customLabel: 'Precio Unitario (MXN)' } },
          { id: '4', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'medicamento', size: 25, order: 'asc', orderBy: '1', customLabel: 'Medicamento' } },
          { id: '5', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'categoria_terapeutica', size: 5, order: 'desc', orderBy: '1', customLabel: 'Categoría' } },
          { id: '6', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'nivel_alerta', size: 5, order: 'desc', orderBy: '1', customLabel: 'Alerta' } },
          { id: '7', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'almacen', size: 5, order: 'desc', orderBy: '1', customLabel: 'Almacén' } },
        ],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: '', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: pharmacyDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-table-pharmacy-dynamic?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visPharmacyTable),
  });

  // Vis 13: Tabla Dinámica e Interactiva - Censo de Camas Hospitalarias
  const visBedsTable = {
    attributes: {
      title: 'Tabla Dinámica - Censo Hospitalario de Camas en Tiempo Real',
      uiStateJSON: '{}',
      description: 'Censo hospitalario en vivo con paciente asignado, diagnóstico y médico',
      visState: JSON.stringify({
        title: 'Censo de Camas Hospitalarias',
        type: 'table',
        params: {
          perPage: 10,
          showPartialRows: false,
          showMetricsAtAllLevels: false,
          sort: { columnIndex: null, direction: null },
          showTotal: false,
          totalFunc: 'sum',
          percentageCol: '',
        },
        aggs: [
          { id: '1', enabled: true, type: 'count', schema: 'metric', params: { customLabel: 'Total' } },
          { id: '2', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'cama_id', size: 25, order: 'asc', orderBy: '_key', customLabel: 'Cama' } },
          { id: '3', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'piso', size: 5, order: 'asc', orderBy: '_key', customLabel: 'Piso' } },
          { id: '4', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'tipo_cama', size: 5, order: 'desc', orderBy: '1', customLabel: 'Tipo de Cama' } },
          { id: '5', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'estado', size: 5, order: 'desc', orderBy: '1', customLabel: 'Estado' } },
          { id: '6', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'paciente_nombre', size: 25, order: 'desc', orderBy: '1', customLabel: 'Paciente' } },
          { id: '7', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'diagnostico', size: 25, order: 'desc', orderBy: '1', customLabel: 'Diagnóstico' } },
          { id: '8', enabled: true, type: 'terms', schema: 'bucket', params: { field: 'medico_tratante', size: 25, order: 'desc', orderBy: '1', customLabel: 'Médico Tratante' } },
        ],
      }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: '', language: 'kuery' },
          filter: [],
          indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        }),
      },
    },
    references: [{ name: 'kibanaSavedObjectMeta.searchSourceJSON.index', type: 'index-pattern', id: bedsDvId }],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-table-beds-dynamic?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visBedsTable),
  });
  console.log('  ✓ 13 visualizaciones oficiales creadas exitosamente.');

  // 8. Crear Dashboard con Layout Ultra-Moderno y Referencias Explícitas
  console.log('\n📊 Vinculando visualizaciones al Dashboard ("centro-medico-dashboard")...');

  const panels = [
    // Fila 1: Encabezado
    { gridData: { x: 0, y: 0, w: 48, h: 4, i: 'p-header' }, panelIndex: 'p-header', panelRefName: 'ref_header', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Fila 2: Barra de Filtros Interactivos Multiselección
    { gridData: { x: 0, y: 4, w: 48, h: 6, i: 'p-controls' }, panelIndex: 'p-controls', panelRefName: 'ref_controls', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Fila 3: KPIs Dinámicos (5 tarjetas)
    { gridData: { x: 0, y: 10, w: 10, h: 7, i: 'p-beds-free' }, panelIndex: 'p-beds-free', panelRefName: 'ref_beds_free', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 10, y: 10, w: 9, h: 7, i: 'p-beds-occ' }, panelIndex: 'p-beds-occ', panelRefName: 'ref_beds_occ', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 19, y: 10, w: 9, h: 7, i: 'p-pharm-crit' }, panelIndex: 'p-pharm-crit', panelRefName: 'ref_pharm_crit', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 28, y: 10, w: 10, h: 7, i: 'p-pharm-stock' }, panelIndex: 'p-pharm-stock', panelRefName: 'ref_pharm_stock', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 38, y: 10, w: 10, h: 7, i: 'p-revenue' }, panelIndex: 'p-revenue', panelRefName: 'ref_revenue', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Fila 4: Gráficos de Barras Comparativos y Apilados
    { gridData: { x: 0, y: 17, w: 24, h: 14, i: 'p-bar-stock' }, panelIndex: 'p-bar-stock', panelRefName: 'ref_bar_stock', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 24, y: 17, w: 24, h: 14, i: 'p-bar-beds' }, panelIndex: 'p-bar-beds', panelRefName: 'ref_bar_beds', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Fila 5: Donas Porcentuales
    { gridData: { x: 0, y: 31, w: 24, h: 12, i: 'p-beds-donut' }, panelIndex: 'p-beds-donut', panelRefName: 'ref_beds_donut', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 24, y: 31, w: 24, h: 12, i: 'p-pharm-pie' }, panelIndex: 'p-pharm-pie', panelRefName: 'ref_pharm_pie', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    // Fila 6: Tablas Dinámicas e Interactivas en Tiempo Real
    { gridData: { x: 0, y: 43, w: 24, h: 16, i: 'p-table-pharm' }, panelIndex: 'p-table-pharm', panelRefName: 'ref_table_pharm', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 24, y: 43, w: 24, h: 16, i: 'p-table-beds' }, panelIndex: 'p-table-beds', panelRefName: 'ref_table_beds', version: '9.5.5', embeddableConfig: { enhancements: {} } },
  ];

  const references = [
    { name: 'ref_header', type: 'visualization', id: 'vis-header' },
    { name: 'ref_controls', type: 'visualization', id: 'vis-controls-filter' },
    { name: 'ref_beds_free', type: 'visualization', id: 'vis-metric-beds-free' },
    { name: 'ref_beds_occ', type: 'visualization', id: 'vis-metric-beds-occupied' },
    { name: 'ref_pharm_crit', type: 'visualization', id: 'vis-metric-pharm-critical' },
    { name: 'ref_pharm_stock', type: 'visualization', id: 'vis-metric-pharm-stock-sum' },
    { name: 'ref_revenue', type: 'visualization', id: 'vis-metric-revenue' },
    { name: 'ref_bar_stock', type: 'visualization', id: 'vis-bar-stock-compare' },
    { name: 'ref_bar_beds', type: 'visualization', id: 'vis-bar-beds-by-floor' },
    { name: 'ref_beds_donut', type: 'visualization', id: 'vis-beds-donut' },
    { name: 'ref_pharm_pie', type: 'visualization', id: 'vis-pharmacy-pie' },
    { name: 'ref_table_pharm', type: 'visualization', id: 'vis-table-pharmacy-dynamic' },
    { name: 'ref_table_beds', type: 'visualization', id: 'vis-table-beds-dynamic' },
  ];

  const dashboardPayload = {
    attributes: {
      title: 'Centro Médico Nacional - Farmacia, Camas & Operación Clínica',
      description:
        'Tablero ejecutivo hospitalario: Semáforo de fármacos críticos, censo en tiempo real de camas por piso y recaudación en MXN.',
      hits: 0,
      timeRestore: false,
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          query: { query: '', language: 'kuery' },
          filter: [],
        }),
      },
      optionsJSON: JSON.stringify({
        useMargins: true,
        hidePanelTitles: false,
      }),
      panelsJSON: JSON.stringify(panels),
    },
    references,
  };

  const dashRes = await fetch(`${KBN_URL}/api/saved_objects/dashboard/centro-medico-dashboard?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(dashboardPayload),
  });

  if (dashRes.ok) {
    console.log(`  ✓ Dashboard "centro-medico-dashboard" actualizado con todas las visualizaciones.`);
  } else {
    console.error('❌ Error creando Dashboard:', await dashRes.json());
  }

  // 9. Exportar los JSON y NDJSON a la carpeta observability/
  console.log('\n💾 Exportando archivos físicos JSON y NDJSON a ./observability/ ...');

  const exportRes = await fetch(`${KBN_URL}/api/saved_objects/_export`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify({
      objects: [
        { type: 'dashboard', id: 'centro-medico-dashboard' },
        { type: 'index-pattern', id: pharmacyDvId },
        { type: 'index-pattern', id: bedsDvId },
        { type: 'index-pattern', id: opsDvId },
      ],
      includeReferencesDeep: true,
    }),
  });

  const ndjsonText = await exportRes.text();
  const ndjsonPath = path.join(rootDir, 'observability', 'kibana-centro-medico-dashboard.ndjson');
  fs.writeFileSync(ndjsonPath, ndjsonText, 'utf-8');
  console.log(`  ✓ Archivo NDJSON generado: ${ndjsonPath}`);

  // Generar también formato JSON regular para inspección fácil
  const jsonLines = ndjsonText
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const jsonPath = path.join(rootDir, 'observability', 'kibana-centro-medico-dashboard.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonLines, null, 2), 'utf-8');
  console.log(`  ✓ Archivo JSON formateado generado: ${jsonPath}`);

  console.log('\n============================================================');
  console.log('🎉 PROCESO COMPLETADO EXITOSAMENTE');
  console.log('============================================================');
  console.log(`🔗 Enlace directo al Dashboard en Kibana:`);
  console.log(`   http://localhost:5601/app/dashboards#/view/centro-medico-dashboard`);
  console.log(`\n📁 Archivos guardados en tu proyecto para importación manual o auditoría:`);
  console.log(`   • ${ndjsonPath}`);
  console.log(`   • ${jsonPath}`);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
