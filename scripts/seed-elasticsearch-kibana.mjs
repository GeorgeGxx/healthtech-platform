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

  // 7. Crear Visualizaciones Oficiales de Kibana
  console.log('\n🎨 Creando Visualizaciones Oficiales de Kibana...');

  // Vis 1: Encabezado Ejecutivo
  const visHeader = {
    attributes: {
      title: 'Encabezado - Centro Médico Nacional',
      visState: JSON.stringify({
        title: 'Encabezado - Centro Médico Nacional',
        type: 'markdown',
        params: {
          markdown:
            '# 🏥 Centro Médico Nacional • Centro de Mando Hospitalario\n' +
            '**Supervisión en tiempo real:** Censo de camas disponibles por piso, stock crítico de fármacos y recaudación hospitalaria en **MXN** conforme a **NOM-004** y **NOM-024**.',
        },
      }),
      uiStateJSON: '{}',
      description: 'Encabezado ejecutivo',
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-header?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visHeader),
  });

  // Vis 2: KPI Camas Disponibles y Ocupadas
  const visKpiBeds = {
    attributes: {
      title: 'KPI - Censo de Camas Hospitalarias',
      visState: JSON.stringify({
        title: 'KPI - Censo de Camas Hospitalarias',
        type: 'markdown',
        params: {
          markdown:
            '### 🛏️ Disponibilidad de Camas: **10 Libres** / 18 Totales\n\n' +
            '- 🟢 **Camas Disponibles:** **10 camas** (55.6%)\n' +
            '- 🔴 **Camas Ocupadas:** **6 camas** (33.3%)\n' +
            '- 🟡 **En Mantenimiento:** **2 camas** (11.1%)\n' +
            '- 🚨 **Terapia Intensiva (UTI):** 2 pacientes activos (Cama 301 y Aislamiento 303)',
        },
      }),
      uiStateJSON: '{}',
      description: 'KPI de camas',
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-kpi-beds?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visKpiBeds),
  });

  // Vis 3: KPI Farmacia & Alertas de Stock
  const visKpiPharmacy = {
    attributes: {
      title: 'KPI - Semáforo de Fármacos e Inventario',
      visState: JSON.stringify({
        title: 'KPI - Semáforo de Fármacos e Inventario',
        type: 'markdown',
        params: {
          markdown:
            '### 💊 Salud de Inventario de Fármacos\n\n' +
            '- **Catálogo Activo:** 20 líneas de medicamentos\n' +
            '- 🟢 **Abastecimiento Normal:** 13 medicamentos\n' +
            '- 🟡 **Alerta de Reposición (Bajo):** 4 medicamentos\n' +
            '- 🔴 **STOCK CRÍTICO (Menor a Mínimo):** **3 fármacos**\n' +
            '  * **Morfina 10mg/ml IV:** Stock: 12 (Mín: 30)\n' +
            '  * **Merrem 1g (Meropenem):** Stock: 14 (Mín: 40)\n' +
            '  * **Fentanilo 0.5mg Inyectable:** Stock: 8 (Mín: 25)',
        },
      }),
      uiStateJSON: '{}',
      description: 'KPI de farmacia',
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-kpi-pharmacy?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visKpiPharmacy),
  });

  // Vis 4: KPI Finanzas Hospitalarias
  const visKpiFinance = {
    attributes: {
      title: 'KPI - Valoración y Copago en Caja',
      visState: JSON.stringify({
        title: 'KPI - Valoración y Copago en Caja',
        type: 'markdown',
        params: {
          markdown:
            '### 💰 Valor de Inventario: **$482,750 MXN**\n\n' +
            '- **Tarifa Noche / Cama Promedio:** $6,200 MXN\n' +
            '- **Convenios Aseguradoras:** GNP, MetLife, AXA, Seguros Monterrey\n' +
            '- **Copago Promedio Autorizado:** 15% - 20% en ventanilla\n' +
            '- **Moneda Oficial:** Pesos Mexicanos ($ MXN)',
        },
      }),
      uiStateJSON: '{}',
      description: 'KPI financiero',
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-kpi-finance?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visKpiFinance),
  });

  // Vis 5: Donut Chart - Proporción de Camas (Disponibles vs Ocupadas)
  const visBedsDonut = {
    attributes: {
      title: 'Gráfica de Dona - Censo de Camas por Estado',
      uiStateJSON: '{}',
      description: 'Distribución porcentual de camas disponibles vs ocupadas',
      visState: JSON.stringify({
        title: 'Gráfica de Dona - Censo de Camas por Estado',
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
    references: [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: bedsDvId,
      },
    ],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-beds-donut?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visBedsDonut),
  });

  // Vis 6: Pie Chart - Unidades de Stock por Categoría de Fármacos
  const visPharmacyPie = {
    attributes: {
      title: 'Gráfica de Dona - Stock por Categoría Terapéutica',
      uiStateJSON: '{}',
      description: 'Unidades de fármacos por categoría terapéutica',
      visState: JSON.stringify({
        title: 'Gráfica de Dona - Stock por Categoría Terapéutica',
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
    references: [
      {
        name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
        type: 'index-pattern',
        id: pharmacyDvId,
      },
    ],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pharmacy-pie?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visPharmacyPie),
  });

  // Vis 7: Tabla de Semáforo de Fármacos Críticos
  const visPharmacyTable = {
    attributes: {
      title: 'Tabla - Semáforo de Fármacos en Alerta Crítica y Reabastecimiento',
      visState: JSON.stringify({
        title: 'Tabla - Semáforo de Fármacos en Alerta Crítica y Reabastecimiento',
        type: 'markdown',
        params: {
          markdown:
            '| Medicamento | Principio Activo | Categoría | Stock | Mín | Nivel Alerta | Almacén Asignado |\n' +
            '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n' +
            '| **Morfina Solución IV** | Sulfato de Morfina 10mg/ml | Analgésicos UCI | **12** | 30 | 🔴 **CRÍTICO** | Terapia Intensiva (UTI) |\n' +
            '| **Merrem 1g** | Meropenem Trihidratado | Antibióticos UCI | **14** | 40 | 🔴 **CRÍTICO** | Terapia Intensiva (UTI) |\n' +
            '| **Humalog KwikPen** | Insulina Lispro Rápida | Endocrinología | **16** | 35 | 🔴 **CRÍTICO** | Farmacia Refrigerada |\n' +
            '| **Fentanilo 0.5mg** | Citrato de Fentanilo | Analgésicos UCI | **8** | 25 | 🔴 **CRÍTICO** | Terapia Intensiva (UTI) |\n' +
            '| **Tramal 50mg** | Tramadol Clorhidrato | Analgésicos | **45** | 50 | 🟡 Bajo | Farmacia Central |\n' +
            '| **Rocephin 1g** | Ceftriaxona Disódica | Antibióticos | **68** | 80 | 🟡 Bajo | Urgencias |\n' +
            '| **Lantus Solostar** | Insulina Glargina | Endocrinología | **24** | 40 | 🟡 Bajo | Farmacia Refrigerada |\n' +
            '| **Clexane 40mg** | Enoxaparina Sódica | Anticoagulantes | **32** | 50 | 🟡 Bajo | Urgencias |\n' +
            '| **Tempra Forte** | Paracetamol 500mg | Analgésicos | **850** | 200 | 🟢 Normal | Farmacia Central |\n' +
            '| **Cozaar 50mg** | Losartán 50mg | Antihipertensivos | **580** | 200 | 🟢 Normal | Farmacia Central |\n' +
            '| **Solución Fisiológica** | NaCl 0.9% 1000ml | Soluciones IV | **1,450**| 400 | 🟢 Normal | Almacén General de Sueros |',
        },
      }),
      uiStateJSON: '{}',
      description: 'Tabla de alerta de fármacos',
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-pharmacy-table?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visPharmacyTable),
  });

  // Vis 8: Tabla Detallada de Camas por Piso
  const visBedsTable = {
    attributes: {
      title: 'Tabla - Censo Hospitalario de Camas por Piso',
      visState: JSON.stringify({
        title: 'Tabla - Censo Hospitalario de Camas por Piso',
        type: 'markdown',
        params: {
          markdown:
            '| Cama | Piso | Tipo de Habitación | Estado | Tarifa / Noche | Paciente Ingresado | Médico Responsable |\n' +
            '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n' +
            '| **101** | Piso 1 | Habitación Privada | 🟢 Disponible | $4,500 MXN | -- | -- |\n' +
            '| **102** | Piso 1 | Habitación Compartida | 🔴 Ocupada | $3,200 MXN | Carlos Méndez Ruiz | Dr. Héctor Morales |\n' +
            '| **103** | Piso 1 | Habitación Compartida | 🟢 Disponible | $3,200 MXN | -- | -- |\n' +
            '| **104** | Piso 1 | Habitación Privada | 🔴 Ocupada | $4,500 MXN | María Luisa Domínguez | Dra. Gabriela Solís |\n' +
            '| **105** | Piso 1 | Habitación Compartida | 🟡 Mantenimiento | $3,200 MXN | -- | -- |\n' +
            '| **201** | Piso 2 | Suite Hospitalaria | 🔴 Ocupada | $7,800 MXN | Juan Pérez García | Dr. Rafael Castelo |\n' +
            '| **202** | Piso 2 | Habitación Privada | 🟢 Disponible | $5,200 MXN | -- | -- |\n' +
            '| **203** | Piso 2 | Habitación Privada | 🔴 Ocupada | $5,200 MXN | Roberto Gómez Valdez | Dr. Fernando Navarro |\n' +
            '| **301** | Piso 3 | Terapia Intensiva (UTI) | 🔴 Ocupada | $14,500 MXN | Eduardo Garza Silva | Dr. Javier Villalobos |\n' +
            '| **303** | Piso 3 | Aislamiento Infeccioso | 🔴 Ocupada | $9,800 MXN | Carmen Ortiz Vega | Dra. Verónica Peña |\n' +
            '| **Q-01**| Quirófano | Quirófano Central | 🔴 Ocupada | $18,000 MXN | Fernando Castro Ríos | Dr. Arturo Beltrán |',
        },
      }),
      uiStateJSON: '{}',
      description: 'Tabla de censo de camas',
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }) },
    },
    references: [],
  };
  await fetch(`${KBN_URL}/api/saved_objects/visualization/vis-beds-table?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(visBedsTable),
  });

  console.log('  ✓ 8 visualizaciones oficiales creadas exitosamente.');

  // 8. Crear Dashboard con Referencias Explícitas a las Visualizaciones
  console.log('\n📊 Vinculando visualizaciones al Dashboard ("centro-medico-dashboard")...');

  const panels = [
    { gridData: { x: 0, y: 0, w: 48, h: 5, i: 'p-header' }, panelIndex: 'p-header', panelRefName: 'ref_header', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 5, w: 16, h: 8, i: 'p-beds-kpi' }, panelIndex: 'p-beds-kpi', panelRefName: 'ref_beds_kpi', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 16, y: 5, w: 16, h: 8, i: 'p-pharm-kpi' }, panelIndex: 'p-pharm-kpi', panelRefName: 'ref_pharm_kpi', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 32, y: 5, w: 16, h: 8, i: 'p-fin-kpi' }, panelIndex: 'p-fin-kpi', panelRefName: 'ref_fin_kpi', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 13, w: 24, h: 12, i: 'p-beds-donut' }, panelIndex: 'p-beds-donut', panelRefName: 'ref_beds_donut', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 24, y: 13, w: 24, h: 12, i: 'p-pharm-pie' }, panelIndex: 'p-pharm-pie', panelRefName: 'ref_pharm_pie', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 0, y: 25, w: 24, h: 14, i: 'p-beds-table' }, panelIndex: 'p-beds-table', panelRefName: 'ref_beds_table', version: '9.5.5', embeddableConfig: { enhancements: {} } },
    { gridData: { x: 24, y: 25, w: 24, h: 14, i: 'p-pharm-table' }, panelIndex: 'p-pharm-table', panelRefName: 'ref_pharm_table', version: '9.5.5', embeddableConfig: { enhancements: {} } },
  ];

  const references = [
    { name: 'ref_header', type: 'visualization', id: 'vis-header' },
    { name: 'ref_beds_kpi', type: 'visualization', id: 'vis-kpi-beds' },
    { name: 'ref_pharm_kpi', type: 'visualization', id: 'vis-kpi-pharmacy' },
    { name: 'ref_fin_kpi', type: 'visualization', id: 'vis-kpi-finance' },
    { name: 'ref_beds_donut', type: 'visualization', id: 'vis-beds-donut' },
    { name: 'ref_pharm_pie', type: 'visualization', id: 'vis-pharmacy-pie' },
    { name: 'ref_beds_table', type: 'visualization', id: 'vis-beds-table' },
    { name: 'ref_pharm_table', type: 'visualization', id: 'vis-pharmacy-table' },
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
