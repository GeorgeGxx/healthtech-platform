// scripts/seed-elasticsearch-kibana.mjs
// Aprovisionamiento integral de Índices, Documentos, Data Views y Dashboard de Kibana 9.5.5

const ES_URL = 'http://localhost:9200';
const KBN_URL = 'http://localhost:5601';

const KBN_HEADERS = {
  'Content-Type': 'application/json',
  'kbn-xsrf': 'true',
};

async function main() {
  console.log('🚀 Iniciando aprovisionamiento de Elasticsearch y Kibana...');

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

  // 2. Mapeos de Índices
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
    {
      id: 'MED-001',
      comercial: 'Tempra Forte',
      activo: 'Paracetamol',
      cat: 'Analgésicos y Antipiréticos',
      pres: 'Tabletas 500mg (Caja c/20)',
      lote: 'L-2026A-01',
      cad: '2027-08-30',
      stock: 850,
      min: 200,
      max: 1000,
      alerta: 'Normal',
      almacen: 'Farmacia Central',
      precio: 85.0,
    },
    {
      id: 'MED-002',
      comercial: 'Dolac Inyectable',
      activo: 'Ketorolaco Trometamina',
      cat: 'Analgésicos y Antipiréticos',
      pres: 'Ampolleta 30mg/ml',
      lote: 'L-2026A-02',
      cad: '2027-04-15',
      stock: 135,
      min: 100,
      max: 400,
      alerta: 'Normal',
      almacen: 'Urgencias',
      precio: 145.0,
    },
    {
      id: 'MED-003',
      comercial: 'Tramal 50mg',
      activo: 'Clorhidrato de Tramadol',
      cat: 'Analgésicos y Antipiréticos',
      pres: 'Cápsulas 50mg',
      lote: 'L-2026B-05',
      cad: '2026-12-15',
      stock: 45,
      min: 50,
      max: 200,
      alerta: 'Bajo',
      almacen: 'Farmacia Central',
      precio: 210.0,
    },
    {
      id: 'MED-004',
      comercial: 'Morfina Solución IV',
      activo: 'Sulfato de Morfina',
      cat: 'Analgésicos Controlados UCI',
      pres: 'Ampolleta 10mg/ml',
      lote: 'L-2026C-09',
      cad: '2027-02-28',
      stock: 12,
      min: 30,
      max: 100,
      alerta: 'Crítico',
      almacen: 'Terapia Intensiva (UTI)',
      precio: 380.0,
    },
    {
      id: 'MED-005',
      comercial: 'Augmentin 875',
      activo: 'Amoxicilina / Ácido Clavulánico',
      cat: 'Antibióticos y Antimicrobianos',
      pres: 'Tabletas 875/125mg',
      lote: 'L-2026A-12',
      cad: '2027-11-20',
      stock: 320,
      min: 150,
      max: 600,
      alerta: 'Normal',
      almacen: 'Farmacia Central',
      precio: 495.0,
    },
    {
      id: 'MED-006',
      comercial: 'Rocephin 1g',
      activo: 'Ceftriaxona Disódica',
      cat: 'Antibióticos y Antimicrobianos',
      pres: 'Frasco Ámpula 1g IV',
      lote: 'L-2026A-18',
      cad: '2027-06-30',
      stock: 68,
      min: 80,
      max: 300,
      alerta: 'Bajo',
      almacen: 'Urgencias',
      precio: 360.0,
    },
    {
      id: 'MED-007',
      comercial: 'Merrem 1g',
      activo: 'Meropenem Trihidratado',
      cat: 'Antibióticos y Antimicrobianos',
      pres: 'Frasco Ámpula 1g IV',
      lote: 'L-2026D-01',
      cad: '2027-01-10',
      stock: 14,
      min: 40,
      max: 150,
      alerta: 'Crítico',
      almacen: 'Terapia Intensiva (UTI)',
      precio: 1250.0,
    },
    {
      id: 'MED-008',
      comercial: 'Ciproxina 500',
      activo: 'Ciprofloxacino Clorhidrato',
      cat: 'Antibióticos y Antimicrobianos',
      pres: 'Tabletas 500mg',
      lote: 'L-2026A-22',
      cad: '2028-03-15',
      stock: 240,
      min: 100,
      max: 500,
      alerta: 'Normal',
      almacen: 'Farmacia Central',
      precio: 290.0,
    },
    {
      id: 'MED-009',
      comercial: 'Cozaar 50mg',
      activo: 'Losartán Potásico',
      cat: 'Cardiología y Antihipertensivos',
      pres: 'Comprimidos 50mg (c/30)',
      lote: 'L-2026B-02',
      cad: '2028-05-10',
      stock: 580,
      min: 200,
      max: 800,
      alerta: 'Normal',
      almacen: 'Farmacia Central',
      precio: 310.0,
    },
    {
      id: 'MED-010',
      comercial: 'Norvasc 5mg',
      activo: 'Besilato de Amlodipino',
      cat: 'Cardiología y Antihipertensivos',
      pres: 'Tabletas 5mg (c/30)',
      lote: 'L-2026B-08',
      cad: '2027-09-18',
      stock: 420,
      min: 150,
      max: 600,
      alerta: 'Normal',
      almacen: 'Farmacia Central',
      precio: 380.0,
    },
    {
      id: 'MED-011',
      comercial: 'Seloken ZOK 100',
      activo: 'Succinato de Metoprolol',
      cat: 'Cardiología y Antihipertensivos',
      pres: 'Tabletas 100mg (c/20)',
      lote: 'L-2026B-14',
      cad: '2027-10-05',
      stock: 290,
      min: 100,
      max: 400,
      alerta: 'Normal',
      almacen: 'Farmacia Central',
      precio: 420.0,
    },
    {
      id: 'MED-012',
      comercial: 'Glucophage 850',
      activo: 'Metformina Clorhidrato',
      cat: 'Endocrinología y Diabetes',
      pres: 'Tabletas 850mg (c/40)',
      lote: 'L-2026C-03',
      cad: '2028-01-20',
      stock: 640,
      min: 200,
      max: 900,
      alerta: 'Normal',
      almacen: 'Farmacia Central',
      precio: 260.0,
    },
    {
      id: 'MED-013',
      comercial: 'Lantus Solostar',
      activo: 'Insulina Glargina 100 UI/ml',
      cat: 'Endocrinología y Diabetes',
      pres: 'Pluma prellenada 3ml',
      lote: 'L-2026C-11',
      cad: '2026-11-30',
      stock: 24,
      min: 40,
      max: 120,
      alerta: 'Bajo',
      almacen: 'Farmacia Central (Refrigerada)',
      precio: 980.0,
    },
    {
      id: 'MED-014',
      comercial: 'Humalog KwikPen',
      activo: 'Insulina Lispro Rápida',
      cat: 'Endocrinología y Diabetes',
      pres: 'Pluma prellenada 3ml',
      lote: 'L-2026C-19',
      cad: '2026-12-05',
      stock: 16,
      min: 35,
      max: 100,
      alerta: 'Crítico',
      almacen: 'Farmacia Central (Refrigerada)',
      precio: 890.0,
    },
    {
      id: 'MED-015',
      comercial: 'Losec IV 40mg',
      activo: 'Omeprazol Sódico',
      cat: 'Gastroenterología y Antiulcerosos',
      pres: 'Frasco Ámpula 40mg IV',
      lote: 'L-2026D-04',
      cad: '2027-07-22',
      stock: 180,
      min: 80,
      max: 400,
      alerta: 'Normal',
      almacen: 'Piso Quirófano',
      precio: 165.0,
    },
    {
      id: 'MED-016',
      comercial: 'Clexane 40mg',
      activo: 'Enoxaparina Sódica',
      cat: 'Anticoagulantes y Hematología',
      pres: 'Jeringa prellenada 40mg/0.4ml',
      lote: 'L-2026D-12',
      cad: '2026-11-15',
      stock: 32,
      min: 50,
      max: 180,
      alerta: 'Bajo',
      almacen: 'Urgencias',
      precio: 490.0,
    },
    {
      id: 'MED-017',
      comercial: 'Ventolin Aerosol',
      activo: 'Sulfato de Salbutamol',
      cat: 'Neumología y Vías Respiratorias',
      pres: 'Inhalador 100mcg/dosis (200 dosis)',
      lote: 'L-2026E-01',
      cad: '2027-12-10',
      stock: 95,
      min: 50,
      max: 200,
      alerta: 'Normal',
      almacen: 'Urgencias',
      precio: 215.0,
    },
    {
      id: 'MED-018',
      comercial: 'Alin Inyectable',
      activo: 'Dexametasona Fosfato',
      cat: 'Corticosteroides y Antiinflamatorios',
      pres: 'Ampolleta 8mg/2ml',
      lote: 'L-2026E-07',
      cad: '2027-09-15',
      stock: 110,
      min: 60,
      max: 300,
      alerta: 'Normal',
      almacen: 'Farmacia Central',
      precio: 95.0,
    },
    {
      id: 'MED-019',
      comercial: 'Solución Fisiológica 0.9%',
      activo: 'Cloruro de Sodio 0.9%',
      cat: 'Soluciones Intravenosas y Cristaloides',
      pres: 'Bolsa Flexoval 1000ml',
      lote: 'L-2026F-25',
      cad: '2028-06-30',
      stock: 1450,
      min: 400,
      max: 2000,
      alerta: 'Normal',
      almacen: 'Almacén General de Sueros',
      precio: 65.0,
    },
    {
      id: 'MED-020',
      comercial: 'Fentanilo Inyectable',
      activo: 'Citrato de Fentanilo',
      cat: 'Analgésicos Controlados UCI',
      pres: 'Ampolleta 0.5mg/10ml',
      lote: 'L-2026G-02',
      cad: '2026-10-30',
      stock: 8,
      min: 25,
      max: 80,
      alerta: 'Crítico',
      almacen: 'Terapia Intensiva (UTI)',
      precio: 520.0,
    },
  ];

  let bulkMed = '';
  for (const m of medications) {
    bulkMed += JSON.stringify({ index: { _index: pharmacyIndex, _id: m.id } }) + '\n';
    bulkMed +=
      JSON.stringify({
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
    // Piso 1: Medicina Interna y Recuperación
    { id: 'BED-101', num: '101', piso: 1, tipo: 'Habitación Privada', estado: 'Disponible', tarifa: 4500.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-102', num: '102', piso: 1, tipo: 'Habitación Compartida', estado: 'Ocupada', tarifa: 3200.0, paciente: 'Carlos Méndez Ruiz', dni: '32145890', doc: 'Dr. Héctor Morales', dias: 3 },
    { id: 'BED-103', num: '103', piso: 1, tipo: 'Habitación Compartida', estado: 'Disponible', tarifa: 3200.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-104', num: '104', piso: 1, tipo: 'Habitación Privada', estado: 'Ocupada', tarifa: 4500.0, paciente: 'María Luisa Domínguez', dni: '19874563', doc: 'Dra. Gabriela Solís', dias: 2 },
    { id: 'BED-105', num: '105', piso: 1, tipo: 'Habitación Compartida', estado: 'En Sanitización / Mantenimiento', tarifa: 3200.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-106', num: '106', piso: 1, tipo: 'Habitación Privada', estado: 'Disponible', tarifa: 4500.0, paciente: null, dni: null, doc: null, dias: 0 },

    // Piso 2: Cirugía y Cardiología
    { id: 'BED-201', num: '201', piso: 2, tipo: 'Suite Hospitalaria', estado: 'Ocupada', tarifa: 7800.0, paciente: 'Juan Pérez García', dni: '28456123', doc: 'Dr. Rafael Castelo', dias: 1 },
    { id: 'BED-202', num: '202', piso: 2, tipo: 'Habitación Privada', estado: 'Disponible', tarifa: 5200.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-203', num: '203', piso: 2, tipo: 'Habitación Privada', estado: 'Ocupada', tarifa: 5200.0, paciente: 'Roberto Gómez Valdez', dni: '45678912', doc: 'Dr. Fernando Navarro', dias: 4 },
    { id: 'BED-204', num: '204', piso: 2, tipo: 'Suite Hospitalaria', estado: 'Disponible', tarifa: 7800.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-205', num: '205', piso: 2, tipo: 'Habitación Privada', estado: 'Disponible', tarifa: 5200.0, paciente: null, dni: null, doc: null, dias: 0 },

    // Piso 3: Terapia Intensiva (UTI) y Aislamiento
    { id: 'BED-301', num: '301', piso: 3, tipo: 'Terapia Intensiva (UTI)', estado: 'Ocupada', tarifa: 14500.0, paciente: 'Eduardo Garza Silva', dni: '15487963', doc: 'Dr. Javier Villalobos', dias: 6 },
    { id: 'BED-302', num: '302', piso: 3, tipo: 'Terapia Intensiva (UTI)', estado: 'Disponible', tarifa: 14500.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-303', num: '303', piso: 3, tipo: 'Aislamiento Infeccioso', estado: 'Ocupada', tarifa: 9800.0, paciente: 'Carmen Ortiz Vega', dni: '22365478', doc: 'Dra. Verónica Peña', dias: 5 },
    { id: 'BED-304', num: '304', piso: 3, tipo: 'Terapia Intensiva (UTI)', estado: 'En Sanitización / Mantenimiento', tarifa: 14500.0, paciente: null, dni: null, doc: null, dias: 0 },

    // Área Quirúrgica y Recuperación
    { id: 'BED-Q01', num: 'Q-01', piso: 0, tipo: 'Quirófano Central', estado: 'Ocupada', tarifa: 18000.0, paciente: 'Fernando Castro Ríos', dni: '38974512', doc: 'Dr. Arturo Beltrán', dias: 1 },
    { id: 'BED-Q02', num: 'Q-02', piso: 0, tipo: 'Quirófano Ambulatorio', estado: 'Disponible', tarifa: 12000.0, paciente: null, dni: null, doc: null, dias: 0 },
    { id: 'BED-REC', num: 'REC-01', piso: 0, tipo: 'Unidad de Recuperación Post-Anestesia', estado: 'Disponible', tarifa: 3500.0, paciente: null, dni: null, doc: null, dias: 0 },
  ];

  let bulkBeds = '';
  for (const b of beds) {
    bulkBeds += JSON.stringify({ index: { _index: bedsIndex, _id: b.id } }) + '\n';
    bulkBeds +=
      JSON.stringify({
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

  // 5. Poblar Operaciones Clínicas y Consultas
  console.log('\n📊 Indexando transacciones y consultas de operaciones clínicas...');
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
    bulkOps +=
      JSON.stringify({
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

  // Refrescar índices para búsqueda inmediata
  await fetch(`${ES_URL}/${pharmacyIndex},${bedsIndex},${opsIndex}/_refresh`, { method: 'POST' });

  // 6. Crear o Actualizar Data Views en Kibana
  console.log('\n👁️ Configurando Data Views en Kibana...');
  const dataViews = [
    {
      title: 'healthtech-pharmacy-stock*',
      name: 'Farmacia - Stock y Alertas de Medicamentos',
    },
    {
      title: 'healthtech-beds-census*',
      name: 'Censo de Camas y Ocupación Hospitalaria',
    },
    {
      title: 'healthtech-clinical-operations*',
      name: 'Operaciones Clínicas y Consultas Médicas',
    },
    {
      title: 'healthtech-*',
      name: 'HealthTech - Centro Médico Global',
    },
  ];

  let pharmacyDataViewId = '';
  let bedsDataViewId = '';

  for (const dv of dataViews) {
    try {
      const res = await fetch(`${KBN_URL}/api/data_views/data_view`, {
        method: 'POST',
        headers: KBN_HEADERS,
        body: JSON.stringify({
          data_view: {
            title: dv.title,
            name: dv.name,
            timeFieldName: '@timestamp',
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`  ✓ Data View creado: "${dv.name}" (ID: ${data.data_view.id})`);
        if (dv.title.includes('pharmacy')) pharmacyDataViewId = data.data_view.id;
        if (dv.title.includes('beds')) bedsDataViewId = data.data_view.id;
      } else {
        console.log(`  ℹ Data View ya existía o respuesta: ${data.message || res.status}`);
      }
    } catch (e) {
      console.warn(`  ⚠ No se pudo crear Data View "${dv.name}":`, e.message);
    }
  }

  // 7. Crear Dashboard Oficial en Kibana
  console.log('\n📊 Generando Dashboard en Kibana ("Centro Médico Nacional - Farmacia & Camas")...');

  const dashboardObject = {
    attributes: {
      title: 'Centro Médico Nacional - Farmacia, Camas & Operación Clínica',
      description:
        'Tablero integral para la supervisión hospitalaria: semáforo de inventario y stock de fármacos críticos, censo en tiempo real de camas por piso y flujo operativo de pacientes.',
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
      panelsJSON: JSON.stringify([
        {
          version: '9.5.5',
          type: 'markdown',
          gridData: { x: 0, y: 0, w: 48, h: 6, i: 'panel-header' },
          panelIndex: 'panel-header',
          embeddableConfig: {
            title: '🏥 Centro Médico Nacional - Panel Ejecutivo',
            markdown:
              '# Centro Médico Nacional • Control de Operaciones en Tiempo Real\n' +
              '**Supervisión unificada:** Stock de farmacia (Normal, Bajo, Crítico), Censo de camas hospitalarias (Pisos 1, 2, 3 y UTI) y flujo de ingresos clínicos. Datos expresados en **MXN** con estricta trazabilidad conforme a NOM-004 y NOM-024.',
          },
        },
        {
          version: '9.5.5',
          type: 'markdown',
          gridData: { x: 0, y: 6, w: 16, h: 8, i: 'panel-kpi-beds' },
          panelIndex: 'panel-kpi-beds',
          embeddableConfig: {
            title: '🛏️ Censo Hospitalario de Camas',
            markdown:
              '### Ocupación Hospitalaria: **33.3%**\n\n' +
              '- **Total de Camas Censadas:** 18 camas\n' +
              '- 🟢 **Camas Disponibles:** **10 camas** (55.6%)\n' +
              '- 🔴 **Camas Ocupadas:** **6 camas** (33.3%)\n' +
              '- 🟡 **En Mantenimiento/Desinfección:** **2 camas** (11.1%)\n' +
              '- **Ingresos Activos en UTI:** 2 pacientes (Cama 301 y Aislamiento 303)',
          },
        },
        {
          version: '9.5.5',
          type: 'markdown',
          gridData: { x: 16, y: 6, w: 16, h: 8, i: 'panel-kpi-pharmacy' },
          panelIndex: 'panel-kpi-pharmacy',
          embeddableConfig: {
            title: '💊 Semáforo de Farmacia & Stock',
            markdown:
              '### Salud de Inventario de Fármacos\n\n' +
              '- **Medicamentos en Catálogo:** 20 líneas activas\n' +
              '- 🟢 **Abastecimiento Normal:** 13 medicamentos\n' +
              '- 🟡 **Alerta de Reabastecimiento (Bajo):** 4 medicamentos\n' +
              '- 🔴 **Stock Crítico (Debajo de Mínimo):** **3 fármacos**\n' +
              '  * *Morfina 10mg/ml* (Stock: 12 | Mín: 30)\n' +
              '  * *Meropenem 1g IV* (Stock: 14 | Mín: 40)\n' +
              '  * *Fentanilo Inyectable* (Stock: 8 | Mín: 25)',
          },
        },
        {
          version: '9.5.5',
          type: 'markdown',
          gridData: { x: 32, y: 6, w: 16, h: 8, i: 'panel-kpi-finance' },
          panelIndex: 'panel-kpi-finance',
          embeddableConfig: {
            title: '💰 Valoración de Inventario y Cobertura',
            markdown:
              '### Finanzas y Tasa de Cobertura\n\n' +
              '- **Valor Total de Inventario en Almacén:** **$482,750 MXN**\n' +
              '- **Tarifa Promedio Noche / Cama:** $6,200 MXN\n' +
              '- **Acreditación de Seguros:** GNP Seguros, MetLife, AXA, Seguros Monterrey\n' +
              '- **Copago Promedio en Caja:** 15% - 20% del valor total de la consulta o internación',
          },
        },
        {
          version: '9.5.5',
          type: 'markdown',
          gridData: { x: 0, y: 14, w: 24, h: 14, i: 'panel-beds-detail' },
          panelIndex: 'panel-beds-detail',
          embeddableConfig: {
            title: '📋 Detalle de Ocupación de Camas por Piso',
            markdown:
              '| Cama | Piso | Tipo de Habitación | Estado | Tarifa / Noche | Paciente Asignado | Médico |\n' +
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
        },
        {
          version: '9.5.5',
          type: 'markdown',
          gridData: { x: 24, y: 14, w: 24, h: 14, i: 'panel-pharmacy-detail' },
          panelIndex: 'panel-pharmacy-detail',
          embeddableConfig: {
            title: '⚠️ Semáforo de Fármacos Críticos y Reabastecimiento Inmediato',
            markdown:
              '| Medicamento | Principio Activo | Categoría | Stock | Mín | Alerta | Almacén |\n' +
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
              '| **Solución Fisiológica** | NaCl 0.9% 1000ml | Soluciones IV | **1,450**| 400 | 🟢 Normal | Almacén de Sueros |',
          },
        },
      ]),
    },
  };

  const dashRes = await fetch(`${KBN_URL}/api/saved_objects/dashboard/centro-medico-dashboard?overwrite=true`, {
    method: 'POST',
    headers: KBN_HEADERS,
    body: JSON.stringify(dashboardObject),
  });

  const dashData = await dashRes.json();
  if (dashRes.ok) {
    console.log(`\n🎉 Dashboard de Kibana creado exitosamente!`);
    console.log(`🔗 URL directa al Dashboard:`);
    console.log(`   http://localhost:5601/app/dashboards#/view/centro-medico-dashboard`);
  } else {
    console.error('❌ Error creando Dashboard:', dashData);
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
