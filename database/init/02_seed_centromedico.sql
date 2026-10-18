-- ============================================================================
-- CENTRO MÉDICO - DATOS DE PRUEBA (SEED) PARA POSTGRESQL 18
-- Archivo: 02_seed_centromedico.sql
-- Descripción:
--   - Datos estructurados, coherentes y con suficiente volumen para practicar.
--   - Rangos de horarios (tstzrange) compatibles con la exclusión GIST.
--   - Jerarquía médica multinivel para practicar CTEs recursivas.
--   - Historias clínicas con JSONB (signos vitales y recetas) y texto para FTS.
--   - Pacientes con y sin obra social, turnos en diferentes estados y pagos.
-- ============================================================================

-- Forzar codificación UTF8 para evitar errores con tildes en Windows/PowerShell
SET client_encoding = 'UTF8';
-- Suprimir los avisos informativos (NOTICE)
SET client_min_messages = warning;

-- ----------------------------------------------------------------------------
-- 1. Países
-- ----------------------------------------------------------------------------
INSERT INTO pais (id_pais, nombre, nacionalidad) VALUES
    ('ARG', 'Argentina',  'Argentina'),
    ('MEX', 'México',     'Mexicana'),
    ('COL', 'Colombia',   'Colombiana'),
    ('PER', 'Perú',       'Peruana'),
    ('CHL', 'Chile',      'Chilena'),
    ('ESP', 'España',     'Española'),
    ('BRA', 'Brasil',     'Brasileña'),
    ('URY', 'Uruguay',    'Uruguaya');

-- ----------------------------------------------------------------------------
-- 2. Obras Sociales / Seguros Médicos
-- ----------------------------------------------------------------------------
INSERT INTO obra_social (nombre, codigo_seguro, porcentaje_cobertura, telefono_contacto) VALUES
    ('OSDE 310',          'OSDE-310', 80.00, '+54 11 4000-5000'),
    ('Swiss Medical',     'SM-BLACK', 75.00, '+54 11 4000-6000'),
    ('Galeno Oro',        'GAL-ORO',  65.00, '+54 11 4000-7000'),
    ('PAMI Jubilados',    'PAMI-NAC', 100.00,'+54 11 4000-8000'),
    ('Particular/Ninguno','PARTIC',    0.00, NULL);

-- ----------------------------------------------------------------------------
-- 3. Especialidades Médicas
-- ----------------------------------------------------------------------------
INSERT INTO especialidad (nombre, descripcion, precio_consulta_base) VALUES
    ('Medicina General', 'Atención primaria y medicina preventiva', 15000.00),
    ('Cardiología',      'Diagnóstico y tratamiento de enfermedades cardíacas', 25000.00),
    ('Traumatología',    'Sistema músculo-esquelético y lesiones', 22000.00),
    ('Pediatría',        'Salud y desarrollo infantil y adolescente', 18000.00),
    ('Neurología',       'Enfermedades del sistema nervioso central y periférico', 28000.00),
    ('Dermatología',     'Enfermedades de la piel, pelo y uñas', 20000.00),
    ('Gastroenterología','Aparato digestivo y órganos asociados', 23000.00);

-- ----------------------------------------------------------------------------
-- 4. Consultorios Físicos
-- ----------------------------------------------------------------------------
INSERT INTO consultorio (codigo, piso, descripcion) VALUES
    ('C-101', 1, 'Consultorio de Guardia y Medicina General'),
    ('C-102', 1, 'Consultorio Pediátrico con juegos infantiles'),
    ('C-201', 2, 'Unidad de Diagnóstico Cardiológico con ECG'),
    ('C-202', 2, 'Consultorio de Traumatología y Yesos'),
    ('C-301', 3, 'Gabinete de Neurología y Estudios EEG'),
    ('C-302', 3, 'Consultorio Dermatológico');

-- ----------------------------------------------------------------------------
-- 5. Médicos (Estructura Jerárquica para WITH RECURSIVE)
--    Nivel 1: Director Médico (id 1)
--    Nivel 2: Jefes de Departamento (id 2, 3) reportan a 1
--    Nivel 3: Especialistas (id 4, 5, 6) reportan a 2 o 3
--    Nivel 4: Residentes (id 7, 8) reportan a 4 o 6
-- ----------------------------------------------------------------------------
-- Nivel 1: Dirección
INSERT INTO medico (id_jefe_directo, matricula, nombre, apellido, email, telefono, fecha_ingreso) VALUES
    (NULL, 'MN-10001', 'Rafael', 'Castelo', 'rcastelo@centromedico.com', '+54 11 5555-0101', '2015-03-01');

-- Nivel 2: Jefaturas de Departamento
INSERT INTO medico (id_jefe_directo, matricula, nombre, apellido, email, telefono, fecha_ingreso) VALUES
    (1,    'MN-10002', 'Laura',  'Gómez',   'lgomez@centromedico.com',   '+54 11 5555-0102', '2017-06-15'),
    (1,    'MN-10003', 'Alberto','Arévalo', 'aarevalo@centromedico.com', '+54 11 5555-0103', '2016-09-01');

-- Nivel 3: Médicos de Planta / Especialistas
INSERT INTO medico (id_jefe_directo, matricula, nombre, apellido, email, telefono, fecha_ingreso) VALUES
    (2,    'MN-10004', 'Jorge',  'Gallaga', 'jgallaga@centromedico.com', '+54 11 5555-0104', '2019-02-01'),
    (2,    'MN-10005', 'Sofía',  'Navarro', 'snavarro@centromedico.com', '+54 11 5555-0105', '2020-04-10'),
    (3,    'MN-10006', 'Martín', 'Rossi',   'mrossi@centromedico.com',   '+54 11 5555-0106', '2018-11-20');

-- Nivel 4: Médicos Residentes
INSERT INTO medico (id_jefe_directo, matricula, nombre, apellido, email, telefono, fecha_ingreso) VALUES
    (4,    'MN-10007', 'Valentina', 'Ruiz',    'vruiz@centromedico.com',    '+54 11 5555-0107', '2023-03-01'),
    (6,    'MN-10008', 'Mateo',     'Morales', 'mmorales@centromedico.com', '+54 11 5555-0108', '2023-03-01');

-- Relación Médicos - Especialidades (N:M con flag principal)
INSERT INTO medico_especialidad (id_medico, id_especialidad, es_principal) VALUES
    (1, 1, TRUE),   -- Castelo: Medicina General (Principal)
    (1, 2, FALSE),  -- Castelo: Cardiología
    (2, 2, TRUE),   -- Gómez: Cardiología (Principal)
    (2, 5, FALSE),  -- Gómez: Neurología
    (3, 3, TRUE),   -- Arévalo: Traumatología (Principal)
    (4, 2, TRUE),   -- Gallaga: Cardiología (Principal)
    (5, 4, TRUE),   -- Navarro: Pediatría (Principal)
    (6, 3, TRUE),   -- Rossi: Traumatología (Principal)
    (7, 2, TRUE),   -- Ruiz: Cardiología (Residente)
    (8, 3, TRUE);   -- Morales: Traumatología (Residente)

-- ----------------------------------------------------------------------------
-- 6. Pacientes (Diversidad de edades, obras sociales y países)
-- ----------------------------------------------------------------------------
INSERT INTO paciente (dni, nombre, apellido, genero, fecha_nacimiento, id_pais, id_obra_social, numero_afiliado, domicilio, telefono, email) VALUES
    ('28456123',  'Juan',     'Pérez García', 'M', '1985-05-14', 'MEX', 1, 'OSDE-88992',  'Av. Insurgentes Sur 1450, CDMX', '+52 55 1234-5678', 'juan.perez@email.com'),
    ('584585658', 'Carlos',   'López',    'M', '2002-02-19', 'MEX', 2, 'SM-99412',    'Av. Reforma 402',     '+52 55 43219876', 'clopez.mex@yahoo.com'),
    ('27854236',  'Claudio',  'López',    'M', '1980-04-12', 'ARG', 3, 'GAL-11204',   'Piedras 2056, CABA',  '+54 11 4455-6677', 'clopez@gmail.com'),
    ('30251236',  'Carlos',   'Ramírez',  'M', '1982-07-05', 'ARG', 1, 'OSDE-77432',  'Cerro Negro 452',     '+54 11 3322-1100', 'cramirez@gmail.com'),
    ('33521569',  'Leandro',  'Paredes',  'M', '1988-06-29', 'ARG', 1, 'OSDE-55610',  'Piedras 150, CABA',   '+54 11 9988-7766', 'leandro.p@gmail.com'),
    ('40123987',  'Mariana',  'Sosa',     'F', '1996-11-14', 'ARG', 2, 'SM-33215',    'Corrientes 1250',     '+54 11 6655-4433', 'msosa@hotmail.com'),
    ('14258963',  'Beatriz',  'Fernández','F', '1955-08-22', 'ARG', 4, 'PAMI-55421',  'Rivadavia 4520',      '+54 11 2233-4455', 'bfernandez@pami.ar'),
    ('16874521',  'Roberto',  'Gutiérrez','M', '1958-03-30', 'ARG', 4, 'PAMI-99812',  'Belgrano 890',        '+54 11 1122-3344', 'rgutierrez@gmail.com'),
    ('94125874',  'Ana',      'Valenzuela','F','1992-09-08', 'CHL', 5, NULL,           'Providencia 1102',    '+56 9 87654321',  'anitav@gmail.com'),
    ('95321456',  'Diego',    'Silva',    'M', '2010-12-05', 'PER', 5, NULL,           'Av. Larco 450, Lima', '+51 987 654321',  'dsilva@outlook.com'),
    ('38951234',  'Lucía',    'Mendoza',  'F', '1995-05-18', 'ARG', 3, 'GAL-44510',   'Mitre 620, Rosario',  '+54 341 5566778', 'lucia.m@gmail.com'),
    ('36412578',  'Federico', 'Benítez',  'M', '1991-10-02', 'URY', 1, 'OSDE-11098',  '18 de Julio 1400',    '+598 99 123456',  'fbenitez@gmail.com'),
    ('48956123',  'Martina',  'Álvarez',  'F', '2022-04-10', 'ARG', 2, 'SM-88120',    'Santa Fe 3400',       '+54 11 7788-9900', 'mama.martina@gmail.com'),
    ('29654123',  'Gonzalo',  'Herrera',  'M', '1982-12-01', 'ESP', 5, NULL,           'Gran Vía 45, Madrid', '+34 612 345678',  'gherrera@yahoo.es');

-- ----------------------------------------------------------------------------
-- 7. Habitaciones
-- ----------------------------------------------------------------------------
INSERT INTO habitacion (numero, tipo, piso, costo_dia, activa) VALUES
    ('HAB-101', 'general',           1, 45000.00, TRUE),
    ('HAB-102', 'general',           1, 45000.00, TRUE),
    ('HAB-201', 'individual',        2, 75000.00, TRUE),
    ('HAB-202', 'individual',        2, 75000.00, TRUE),
    ('UTI-01',  'terapia_intensiva', 3, 160000.00, TRUE),
    ('OBS-01',  'observacion',       1, 30000.00, TRUE);

-- ----------------------------------------------------------------------------
-- 8. Turnos Médicos (con rangos tstzrange sin solapamiento de médico)
-- ----------------------------------------------------------------------------
INSERT INTO turno (id_paciente, id_medico, id_especialidad, id_consultorio, horario_rango, estado, motivo_consulta, observaciones) VALUES
    -- Turnos Pasados (Atendidos)
    (4, 2, 2, 3, tstzrange('2024-02-10 09:00:00-03', '2024-02-10 09:30:00-03', '[)'), 'atendido', 'Control hipertensión arterial', 'Paciente con tratamiento regular'),
    (5, 2, 2, 3, tstzrange('2024-02-10 09:30:00-03', '2024-02-10 10:00:00-03', '[)'), 'atendido', 'Dolor precordial esporádico', 'Se solicitó ECG'),
    (7, 2, 2, 3, tstzrange('2024-02-10 10:00:00-03', '2024-02-10 10:30:00-03', '[)'), 'atendido', 'Control anual PAMI', 'Control de rutina'),
    (3, 3, 3, 4, tstzrange('2024-02-11 14:00:00-03', '2024-02-11 14:30:00-03', '[)'), 'atendido', 'Dolor lumbar crónico', 'Traumatismo previo'),
    (11, 3, 3, 4, tstzrange('2024-02-11 14:30:00-03', '2024-02-11 15:00:00-03', '[)'), 'atendido', 'Esguince de tobillo derecho', 'Requiere inmovilización'),
    (1, 5, 4, 2, tstzrange('2024-02-12 11:00:00-03', '2024-02-12 11:30:00-03', '[)'), 'atendido', 'Control de crecimiento y vacunas', 'Desarrollo acorde a la edad'),
    (13, 5, 4, 2, tstzrange('2024-02-12 11:30:00-03', '2024-02-12 12:00:00-03', '[)'), 'atendido', 'Fiebre persistente y catarro', 'Cuadro bronquial leve'),
    (2, 4, 2, 3, tstzrange('2024-02-15 16:00:00-03', '2024-02-15 16:30:00-03', '[)'), 'atendido', 'Apto físico universitario', 'Examen cardiovascular normal'),
    (4, 2, 2, 3, tstzrange('2024-03-12 09:00:00-03', '2024-03-12 09:30:00-03', '[)'), 'atendido', 'Seguimiento de medicación', 'Ajuste de dosis Losartán'),
    (8, 2, 2, 3, tstzrange('2024-03-12 09:30:00-03', '2024-03-12 10:00:00-03', '[)'), 'atendido', 'Disnea al esfuerzo', 'Estudio ecocardiográfico'),

    -- Turnos Pasados con otros estados (Cancelado, Ausente)
    (6, 4, 2, 3, tstzrange('2024-03-15 15:00:00-03', '2024-03-15 15:30:00-03', '[)'), 'cancelado', 'Chequeo anual', 'Cancelado por el paciente 24hs antes'),
    (9, 6, 3, 4, tstzrange('2024-03-15 16:00:00-03', '2024-03-15 16:30:00-03', '[)'), 'ausente',   'Dolor cervical', 'No asistió al turno'),

    -- Turnos Futuros (Confirmados y Pendientes)
    (10, 5, 4, 2, tstzrange('2026-11-05 10:00:00-03', '2026-11-05 10:30:00-03', '[)'), 'confirmado', 'Fiebre y dolor de oídos', 'Confirmado telefónicamente'),
    (12, 1, 1, 1, tstzrange('2026-11-05 10:30:00-03', '2026-11-05 11:00:00-03', '[)'), 'confirmado', 'Chequeo general de rutina', 'Estudios de sangre en mano'),
    (14, 2, 2, 3, tstzrange('2026-11-06 09:00:00-03', '2026-11-06 09:30:00-03', '[)'), 'pendiente',  'Evaluación cardiológica', 'Espera de autorización obra social'),
    (3,  3, 3, 4, tstzrange('2026-11-06 14:00:00-03', '2026-11-06 14:30:00-03', '[)'), 'confirmado', 'Control postoperatorio rodilla', 'Revisión de puntos');

-- ----------------------------------------------------------------------------
-- 9. Historias Clínicas (con JSONB y diagnósticos CIE-10)
-- ----------------------------------------------------------------------------
INSERT INTO historia_clinica (id_paciente, id_medico, id_turno, fecha_atencion, diagnostico_codigo_cie, diagnostico_descripcion, tratamiento, signos_vitales, receta_medicamentos) VALUES
(
    4, 2, 1, '2024-02-10 09:25:00-03',
    'I10',
    'Hipertensión esencial primaria descompensada',
    'Se ajusta medicación antihipertensiva. Dieta hiposódica y control en 30 días.',
    '{"presion_arterial": "145/95", "frecuencia_cardiaca_lpm": 82, "temperatura_c": 36.6, "peso_kg": 85.0, "talla_cm": 175, "oxigeno_pct": 98}'::jsonb,
    '[{"medicamento": "Losartán", "dosis": "50mg", "frecuencia": "cada 12 horas", "dias": 30}, {"medicamento": "Amlodipina", "dosis": "5mg", "frecuencia": "cada 24 horas", "dias": 30}]'::jsonb
),
(
    5, 2, 2, '2024-02-10 09:55:00-03',
    'R07.4',
    'Dolor torácico no especificado, compatible con reflujo gastroesofágico o estrés muscular',
    'ECG en límites normales. Se solicita ergometría y valoración gástrica.',
    '{"presion_arterial": "125/80", "frecuencia_cardiaca_lpm": 68, "temperatura_c": 36.5, "peso_kg": 76.2, "talla_cm": 178, "oxigeno_pct": 99}'::jsonb,
    '[{"medicamento": "Omeprazol", "dosis": "20mg", "frecuencia": "cada 24 horas en ayunas", "dias": 14}]'::jsonb
),
(
    7, 2, 3, '2024-02-10 10:25:00-03',
    'E11.9',
    'Diabetes mellitus tipo 2 sin complicaciones aparentes y dislipemia',
    'Mantener dosis habitual de metformina y estatinas. Control de laboratorio trimestral.',
    '{"presion_arterial": "130/80", "frecuencia_cardiaca_lpm": 74, "temperatura_c": 36.4, "peso_kg": 68.0, "talla_cm": 158, "oxigeno_pct": 97}'::jsonb,
    '[{"medicamento": "Metformina", "dosis": "850mg", "frecuencia": "con cena", "dias": 90}, {"medicamento": "Atorvastatina", "dosis": "20mg", "frecuencia": "noche", "dias": 90}]'::jsonb
),
(
    3, 3, 4, '2024-02-11 14:28:00-03',
    'M54.5',
    'Lumbago crónico mecánico agudizado',
    'Kinesioterapia 10 sesiones, reposo relativo y analgésicos.',
    '{"presion_arterial": "120/75", "frecuencia_cardiaca_lpm": 70, "temperatura_c": 36.6, "peso_kg": 80.5, "talla_cm": 172, "oxigeno_pct": 98}'::jsonb,
    '[{"medicamento": "Ibuprofeno", "dosis": "600mg", "frecuencia": "cada 8 horas con comida", "dias": 7}, {"medicamento": "Pridinol", "dosis": "4mg", "frecuencia": "cada 12 horas", "dias": 5}]'::jsonb
),
(
    11, 3, 5, '2024-02-11 14:55:00-03',
    'S93.4',
    'Esguince del ligamento lateral externo del tobillo derecho grado II',
    'Bota Walker por 15 días, hielo local 3 veces al día y elevación del miembro.',
    '{"presion_arterial": "115/70", "frecuencia_cardiaca_lpm": 75, "temperatura_c": 36.7, "peso_kg": 62.0, "talla_cm": 165, "oxigeno_pct": 99}'::jsonb,
    '[{"medicamento": "Diclofenac sódico", "dosis": "75mg", "frecuencia": "cada 12 horas", "dias": 5}]'::jsonb
),
(
    1, 5, 6, '2024-02-12 11:25:00-03',
    'Z00.1',
    'Control de salud de rutina del niño sano',
    'Vacunación completa al día. Se pautan pautas de nutrición y juego.',
    '{"presion_arterial": "95/60", "frecuencia_cardiaca_lpm": 98, "temperatura_c": 36.5, "peso_kg": 19.5, "talla_cm": 110, "oxigeno_pct": 100}'::jsonb,
    '[]'::jsonb
),
(
    13, 5, 7, '2024-02-12 11:55:00-03',
    'J20.9',
    'Bronquitis aguda con síndrome bronquial obstructivo leve',
    'Nebulizaciones con solución salina y salbutamol si hay dificultad respiratoria.',
    '{"presion_arterial": "90/55", "frecuencia_cardiaca_lpm": 110, "temperatura_c": 38.2, "peso_kg": 12.0, "talla_cm": 88, "oxigeno_pct": 96}'::jsonb,
    '[{"medicamento": "Paracetamol gotas", "dosis": "30 gotas", "frecuencia": "cada 6 horas si fiebre > 38", "dias": 3}, {"medicamento": "Salbutamol aerosol", "dosis": "2 disparos con aerocámara", "frecuencia": "cada 6 horas", "dias": 5}]'::jsonb
),
(
    4, 2, 9, '2024-03-12 09:25:00-03',
    'I10',
    'Hipertensión arterial controlada y buena tolerancia medicamentosa',
    'Presión arterial normalizada con tratamiento actual. Mantener conducta.',
    '{"presion_arterial": "125/82", "frecuencia_cardiaca_lpm": 72, "temperatura_c": 36.5, "peso_kg": 83.5, "talla_cm": 175, "oxigeno_pct": 98}'::jsonb,
    '[{"medicamento": "Losartán", "dosis": "50mg", "frecuencia": "cada 12 horas", "dias": 60}]'::jsonb
);

-- ----------------------------------------------------------------------------
-- 10. Internaciones Hospitalarias
-- ----------------------------------------------------------------------------
INSERT INTO internacion (id_paciente, id_medico_responsable, id_habitacion, fecha_ingreso, fecha_alta, diagnostico_ingreso, motivo_alta, costo_total_estimado) VALUES
    -- Internación ya finalizada con alta médica
    (8, 2, 5, '2024-01-15 08:30:00-03', '2024-01-22 14:00:00-03', 'Insuficiencia cardíaca congestiva descompensada', 'Compensación hemodinámica completa y buena evolución clínica', 1120000.00),
    (3, 3, 3, '2024-02-20 10:00:00-03', '2024-02-23 11:30:00-03', 'Cirugía de meniscos rodilla izquierda', 'Alta quirúrgica con deambulación asistida', 225000.00),
    (14, 1, 4, '2024-03-01 12:00:00-03', '2024-03-03 16:00:00-03', 'Neumonía bacteriana adquirida en la comunidad', 'Buena respuesta a antibióticos endovenosos', 150000.00),
    -- Pacientes actualmente internados (fecha_alta IS NULL)
    (7, 2, 1, '2026-10-14 18:00:00-03', NULL, 'Accidente cerebrovascular isquémico en evolución', NULL, 180000.00),
    (2, 3, 2, '2026-10-16 09:15:00-03', NULL, 'Politraumatismo por accidente en vía pública', NULL, 90000.00);

-- ----------------------------------------------------------------------------
-- 11. Conceptos de Pago
-- ----------------------------------------------------------------------------
INSERT INTO concepto_pago (nombre, descripcion) VALUES
    ('Consulta Médica Especializada', 'Honorarios de consulta médica ambulatoria'),
    ('Copago de Obra Social',        'Diferencial o coseguro a cargo del paciente'),
    ('Día de Internación en Piso',    'Costo diario de habitación general/individual'),
    ('Día de Internación en UTI',     'Unidad de Terapia Intensiva con soporte vital'),
    ('Estudio Electrocardiograma',    'Estudio complementario de cardiología'),
    ('Procedimiento Quirúrgico Menor','Cirugía ambulatoria o curaciones complejas');

-- ----------------------------------------------------------------------------
-- 12. Pagos Registrados
-- ----------------------------------------------------------------------------
INSERT INTO pago (id_paciente, id_turno, id_internacion, id_concepto, fecha_pago, monto_bruto, descuento_cobertura, metodo_pago, estado, comprobante_fiscal, detalles_transaccion) VALUES
    -- Turno 1 (OSDE 80%)
    (4, 1, NULL, 1, '2024-02-10 09:35:00-03', 25000.00, 20000.00, 'obra_social', 'completado', 'FACT-A-0001', '{"autorizacion": "AUTH-9912", "terminal": "POS-01"}'::jsonb),
    -- Turno 2 (Swiss Medical 75%)
    (5, 2, NULL, 1, '2024-02-10 10:05:00-03', 25000.00, 18750.00, 'tarjeta_debito', 'completado', 'FACT-B-0002', '{"lote": 45, "tarjeta_ultimos4": "4321"}'::jsonb),
    -- Turno 3 (PAMI 100%)
    (7, 3, NULL, 1, '2024-02-10 10:35:00-03', 25000.00, 25000.00, 'obra_social', 'completado', 'FACT-B-0003', '{"convenio": "PAMI-TOTAL"}'::jsonb),
    -- Turno 4 (Galeno 65%)
    (3, 4, NULL, 1, '2024-02-11 14:35:00-03', 22000.00, 14300.00, 'efectivo', 'completado', 'FACT-B-0004', '{}'::jsonb),
    -- Turno 5 (Galeno 65%)
    (11, 5, NULL, 1, '2024-02-11 15:05:00-03', 22000.00, 14300.00, 'transferencia', 'completado', 'FACT-B-0005', '{"comprobante_banco": "TRX-77884"}'::jsonb),
    -- Turno 6 (Particular 0%)
    (1, 6, NULL, 1, '2024-02-12 11:35:00-03', 18000.00, 0.00, 'tarjeta_credito', 'completado', 'FACT-B-0006', '{"cuotas": 1, "tarjeta": "Visa"}'::jsonb),
    -- Turno 8 (Particular 0%)
    (2, 8, NULL, 1, '2024-02-15 16:35:00-03', 25000.00, 0.00, 'efectivo', 'completado', 'FACT-B-0007', '{}'::jsonb),
    -- Pago de Internación 1 (PAMI con copago particular)
    (8, NULL, 1, 4, '2024-01-23 10:00:00-03', 1120000.00, 950000.00, 'transferencia', 'completado', 'FACT-A-0008', '{"concepto": "Liquidacion internacion UTI"}'::jsonb),
    -- Pago de Internación 2
    (3, NULL, 2, 3, '2024-02-23 12:00:00-03', 225000.00, 146250.00, 'tarjeta_debito', 'completado', 'FACT-B-0009', '{"tarjeta_ultimos4": "8812"}'::jsonb);

-- ----------------------------------------------------------------------------
-- 13. Medicamentos e Inventario de Farmacia Hospitalaria
-- ----------------------------------------------------------------------------
INSERT INTO medicamento (id_medicamento, nombre_comercial, principio_activo, categoria_terapeutica, presentacion, lote, caducidad, stock_actual, stock_minimo, stock_maximo, nivel_alerta, ubicacion_almacen, precio_unitario_mxn) VALUES
    ('MED-001', 'Tempra Forte', 'Paracetamol', 'Analgésicos y Antipiréticos', 'Tabletas 500mg (Caja c/20)', 'L-2026A-01', '2027-08-30', 850, 200, 1000, 'Normal', 'Farmacia Central', 85.00),
    ('MED-002', 'Dolac Inyectable', 'Ketorolaco Trometamina', 'Analgésicos y Antipiréticos', 'Ampolleta 30mg/ml', 'L-2026A-02', '2027-04-15', 135, 100, 400, 'Normal', 'Urgencias', 145.00),
    ('MED-003', 'Tramal 50mg', 'Clorhidrato de Tramadol', 'Analgésicos y Antipiréticos', 'Cápsulas 50mg', 'L-2026B-05', '2026-12-15', 45, 50, 200, 'Bajo', 'Farmacia Central', 210.00),
    ('MED-004', 'Morfina Solución IV', 'Sulfato de Morfina', 'Analgésicos Controlados UCI', 'Ampolleta 10mg/ml', 'L-2026C-09', '2027-02-28', 12, 30, 100, 'Crítico', 'Terapia Intensiva (UTI)', 380.00),
    ('MED-005', 'Augmentin 875', 'Amoxicilina / Ácido Clavulánico', 'Antibióticos y Antimicrobianos', 'Tabletas 875/125mg', 'L-2026A-12', '2027-11-20', 320, 150, 600, 'Normal', 'Farmacia Central', 495.00),
    ('MED-006', 'Rocephin 1g', 'Ceftriaxona Disódica', 'Antibióticos y Antimicrobianos', 'Frasco Ámpula 1g IV', 'L-2026A-18', '2027-06-30', 68, 80, 300, 'Bajo', 'Urgencias', 360.00),
    ('MED-007', 'Merrem 1g', 'Meropenem Trihidratado', 'Antibióticos y Antimicrobianos', 'Frasco Ámpula 1g IV', 'L-2026D-01', '2027-01-10', 14, 40, 150, 'Crítico', 'Terapia Intensiva (UTI)', 1250.00),
    ('MED-008', 'Ciproxina 500', 'Ciprofloxacino Clorhidrato', 'Antibióticos y Antimicrobianos', 'Tabletas 500mg', 'L-2026A-22', '2028-03-15', 240, 100, 500, 'Normal', 'Farmacia Central', 290.00),
    ('MED-009', 'Cozaar 50mg', 'Losartán Potásico', 'Cardiología y Antihipertensivos', 'Comprimidos 50mg (c/30)', 'L-2026B-02', '2028-05-10', 580, 200, 800, 'Normal', 'Farmacia Central', 310.00),
    ('MED-010', 'Norvasc 5mg', 'Besilato de Amlodipino', 'Cardiología y Antihipertensivos', 'Tabletas 5mg (c/30)', 'L-2026B-08', '2027-09-18', 420, 150, 600, 'Normal', 'Farmacia Central', 380.00),
    ('MED-011', 'Adrenalina UCI', 'Epinefrina', 'Urgencias y Soporte Vital', 'Ampolleta 1mg/ml', 'L-2026E-01', '2026-11-30', 18, 50, 150, 'Crítico', 'Carro Rojo Urgencias', 120.00),
    ('MED-012', 'Atropina 1mg', 'Sulfato de Atropina', 'Urgencias y Soporte Vital', 'Ampolleta 1mg/ml', 'L-2026E-03', '2027-07-22', 25, 40, 120, 'Bajo', 'Carro Rojo Urgencias', 95.00),
    ('MED-013', 'Clexane 40mg', 'Enoxaparina Sódica', 'Hematología y Anticoagulantes', 'Jeringa Prellenada 40mg/0.4ml', 'L-2026C-11', '2027-10-15', 185, 100, 400, 'Normal', 'Farmacia Central', 540.00),
    ('MED-014', 'Eliquis 5mg', 'Apixabán', 'Hematología y Anticoagulantes', 'Tabletas 5mg (c/60)', 'L-2026C-15', '2028-01-20', 110, 80, 250, 'Normal', 'Farmacia Central', 1650.00),
    ('MED-015', 'Ventolin Aerosol', 'Salbutamol', 'Neumología y Vías Respiratorias', 'Inhalador 100mcg (200 dosis)', 'L-2026B-20', '2027-12-05', 95, 60, 250, 'Normal', 'Farmacia Central', 285.00),
    ('MED-016', 'Pulmicort Turbuhaler', 'Budesonida', 'Neumología y Vías Respiratorias', 'Polvo Inhalación 200mcg', 'L-2026B-25', '2027-08-14', 40, 50, 150, 'Bajo', 'Farmacia Central', 720.00),
    ('MED-017', 'Lantus SoloStar', 'Insulina Glargina', 'Endocrinología y Diabetes', 'Pluma Precargada 100 UI/ml', 'L-2026F-02', '2027-05-30', 88, 50, 200, 'Normal', 'Refrigerador Farmacia Central', 890.00),
    ('MED-018', 'Glucophage 850', 'Clorhidrato de Metformina', 'Endocrinología y Diabetes', 'Tabletas 850mg (c/30)', 'L-2026F-08', '2028-06-30', 650, 200, 1000, 'Normal', 'Farmacia Central', 195.00),
    ('MED-019', 'Fentanilo UCI', 'Citrato de Fentanilo', 'Analgésicos Controlados UCI', 'Ampolleta 0.5mg/10ml', 'L-2026C-22', '2026-10-31', 8, 25, 80, 'Crítico', 'Terapia Intensiva (UTI)', 450.00),
    ('MED-020', 'Solución Fisiológica 0.9%', 'Cloruro de Sodio', 'Soluciones y Terapia IV', 'Bolsa 1000ml c/infusor', 'L-2026S-99', '2028-12-31', 1450, 500, 2500, 'Normal', 'Almacén General', 65.00)
ON CONFLICT (id_medicamento) DO UPDATE SET
    nombre_comercial = EXCLUDED.nombre_comercial,
    principio_activo = EXCLUDED.principio_activo,
    categoria_terapeutica = EXCLUDED.categoria_terapeutica,
    presentacion = EXCLUDED.presentacion,
    lote = EXCLUDED.lote,
    caducidad = EXCLUDED.caducidad,
    stock_actual = EXCLUDED.stock_actual,
    stock_minimo = EXCLUDED.stock_minimo,
    stock_maximo = EXCLUDED.stock_maximo,
    nivel_alerta = EXCLUDED.nivel_alerta,
    ubicacion_almacen = EXCLUDED.ubicacion_almacen,
    precio_unitario_mxn = EXCLUDED.precio_unitario_mxn,
    activo = EXCLUDED.activo;

-- ============================================================================
-- FIN DE LA CARGA DE DATOS (SEED)
-- ============================================================================
