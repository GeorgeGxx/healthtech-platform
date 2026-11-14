-- ============================================================================
-- MEDICAL CENTER FOR POSTGRESQL 18: PRACTICE GUIDE AND QUERY SUITE
-- LEVELS: BASIC, INTERMEDIATE, AND ADVANCED
-- File: 03_centromedico_practice_queries.sql
-- ============================================================================

-- Force UTF8 encoding to avoid accent issues on Windows/PowerShell
SET client_encoding = 'UTF8';

-- ============================================================================
-- SECTION 1: BASIC LEVEL (FUNDAMENTALS, CRUD, FILTERS, AND BASIC AGGREGATIONS)
-- ============================================================================

-- 1.1 Simple filtering, ranges with BETWEEN, and sorting
-- List patients born between 1980 and 2000, sorted from youngest to oldest
SELECT 
    id_paciente,
    dni,
    nombre || ' ' || apellido AS nombre_completo,
    genero,
    fecha_nacimiento,
    email
FROM paciente
WHERE fecha_nacimiento BETWEEN '1980-01-01' AND '2000-12-31'
ORDER BY fecha_nacimiento DESC;

-- 1.2 Case-insensitive search with ILIKE and IN operators
-- Find patients with gmail or yahoo emails who belong to Argentina or Colombia
SELECT 
    dni,
    nombre,
    apellido,
    id_pais,
    email,
    telefono
FROM paciente
WHERE (email ILIKE '%@gmail.com' OR email ILIKE '%@yahoo.%')
  AND id_pais IN ('ARG', 'COL')
ORDER BY apellido ASC, nombre ASC;

-- 1.3 Inline date calculations: AGE(), EXTRACT(), and DATE_PART()
-- Get the exact age in years of each patient and classify whether pediatric or adult
SELECT 
    dni,
    nombre || ' ' || apellido AS paciente,
    fecha_nacimiento,
    DATE_PART('year', AGE(CURRENT_DATE, fecha_nacimiento)) AS edad_actual,
    CASE 
        WHEN DATE_PART('year', AGE(CURRENT_DATE, fecha_nacimiento)) < 15 THEN 'Pediátrico'
        WHEN DATE_PART('year', AGE(CURRENT_DATE, fecha_nacimiento)) >= 65 THEN 'Adulto Mayor'
        ELSE 'Adulto'
    END AS grupo_etario
FROM paciente
ORDER BY edad_actual ASC;

-- 1.4 Null handling with COALESCE and safe concatenation
-- List physicians showing their phone number or a default message, along with their tenure
SELECT 
    matricula,
    'Dr/a. ' || nombre || ' ' || apellido AS medico,
    email,
    COALESCE(telefono, 'Sin teléfono registrado') AS contacto_telefonico,
    fecha_ingreso,
    DATE_PART('year', AGE(CURRENT_DATE, fecha_ingreso)) AS anios_antiguedad
FROM medico
WHERE activo = TRUE
ORDER BY fecha_ingreso ASC;

-- 1.5 Basic aggregations: COUNT, SUM, AVG, MIN, MAX with grouping
-- Total billed, average collected, and transaction count by payment method
SELECT 
    metodo_pago,
    COUNT(*) AS total_transacciones,
    SUM(monto_bruto) AS total_bruto,
    SUM(descuento_cobertura) AS total_cobertura_aplicada,
    SUM(monto_neto) AS recaudacion_neta_real,
    ROUND(AVG(monto_neto), 2) AS ticket_promedio
FROM pago
WHERE estado = 'completado'
GROUP BY metodo_pago
ORDER BY recaudacion_neta_real DESC;

-- 1.6 Group filtering with HAVING
-- Specialties with a base fee above $18,000 and at least 2 associated physicians
SELECT 
    e.nombre AS especialidad,
    e.precio_consulta_base,
    COUNT(me.id_medico) AS cantidad_medicos
FROM especialidad e
JOIN medico_especialidad me ON e.id_especialidad = me.id_especialidad
GROUP BY e.id_especialidad, e.nombre, e.precio_consulta_base
HAVING e.precio_consulta_base >= 18000.00 AND COUNT(me.id_medico) >= 2
ORDER BY cantidad_medicos DESC;

-- 1.7 Classic INNER JOIN across multiple entities
-- List attended appointments detailing start date, patient, physician, and consulting room
SELECT 
    t.id_turno,
    lower(t.horario_rango) AS fecha_hora_cita,
    p.nombre || ' ' || p.apellido AS paciente,
    p.dni,
    'Dr/a. ' || m.apellido AS medico,
    e.nombre AS especialidad,
    c.codigo AS consultorio,
    t.motivo_consulta
FROM turno t
JOIN paciente p ON t.id_paciente = p.id_paciente
JOIN medico m ON t.id_medico = m.id_medico
JOIN especialidad e ON t.id_especialidad = e.id_especialidad
LEFT JOIN consultorio c ON t.id_consultorio = c.id_consultorio
WHERE t.estado = 'atendido'
ORDER BY fecha_hora_cita ASC;

-- 1.8 LEFT JOIN to identify records with no activity (Anti-Join)
-- Detect physicians who do NOT have any assigned appointments yet
SELECT 
    m.id_medico,
    m.matricula,
    m.nombre || ' ' || m.apellido AS medico,
    m.email
FROM medico m
LEFT JOIN turno t ON m.id_medico = t.id_medico
WHERE t.id_turno IS NULL;

-- 1.9 Modern standard SQL pagination (OFFSET / FETCH)
-- Patient pagination (Page 2, 5 records per page)
SELECT 
    id_paciente,
    dni,
    nombre,
    apellido,
    email
FROM paciente
ORDER BY id_paciente ASC
OFFSET 5 ROWS
FETCH FIRST 5 ROWS ONLY;


-- ============================================================================
-- SECTION 2: INTERMEDIATE LEVEL (CTEs, WINDOW FUNCTIONS, AND ADVANCED ANALYTICS)
-- ============================================================================

-- 2.1 Common Table Expressions (CTE) for modular breakdown
-- Identify high-cost patients (those who generated more spending than the average)
WITH gasto_por_paciente AS (
    SELECT 
        p.id_paciente,
        p.dni,
        p.nombre || ' ' || p.apellido AS paciente,
        os.nombre AS obra_social,
        SUM(pg.monto_bruto) AS gasto_total_acumulado
    FROM paciente p
    JOIN pago pg ON p.id_paciente = pg.id_paciente
    LEFT JOIN obra_social os ON p.id_obra_social = os.id_obra_social
    WHERE pg.estado = 'completado'
    GROUP BY p.id_paciente, p.dni, p.nombre, p.apellido, os.nombre
),
promedio_general AS (
    SELECT AVG(gasto_total_acumulado) AS promedio_gasto
    FROM gasto_por_paciente
)
SELECT 
    g.paciente,
    g.dni,
    g.obra_social,
    g.gasto_total_acumulado,
    ROUND(g.gasto_total_acumulado - pg.promedio_gasto, 2) AS diferencia_vs_promedio
FROM gasto_por_paciente g
CROSS JOIN promedio_general pg
WHERE g.gasto_total_acumulado > pg.promedio_gasto
ORDER BY g.gasto_total_acumulado DESC;

-- 2.2 Window Functions: ROW_NUMBER(), RANK(), and DENSE_RANK()
-- Ranking of physicians by gross billing volume generated from consultations
SELECT 
    m.id_medico,
    'Dr/a. ' || m.nombre || ' ' || m.apellido AS medico,
    COUNT(pg.id_pago) AS cantidad_consultas_cobradas,
    SUM(pg.monto_bruto) AS total_facturado,
    ROW_NUMBER() OVER (ORDER BY SUM(pg.monto_bruto) DESC) AS ranking_filas,
    DENSE_RANK() OVER (ORDER BY SUM(pg.monto_bruto) DESC) AS ranking_denso
FROM medico m
JOIN turno t ON m.id_medico = t.id_medico
JOIN pago pg ON t.id_turno = pg.id_turno
WHERE pg.estado = 'completado'
GROUP BY m.id_medico, m.nombre, m.apellido;

-- 2.3 Window Functions: LAG() and LEAD() for temporal appointment analysis
-- Calculate how many days elapsed between the previous and current appointment for each patient
SELECT 
    p.nombre || ' ' || p.apellido AS paciente,
    t.id_turno,
    lower(t.horario_rango)::date AS fecha_turno,
    LAG(lower(t.horario_rango)::date) OVER (
        PARTITION BY t.id_paciente 
        ORDER BY lower(t.horario_rango)
    ) AS fecha_turno_anterior,
    lower(t.horario_rango)::date - LAG(lower(t.horario_rango)::date) OVER (
        PARTITION BY t.id_paciente 
        ORDER BY lower(t.horario_rango)
    ) AS dias_desde_ultima_consulta
FROM turno t
JOIN paciente p ON t.id_paciente = p.id_paciente
WHERE t.estado = 'atendido'
ORDER BY p.apellido, lower(t.horario_rango);

-- 2.4 Running Total (Cumulative total with moving window)
-- Chronological evolution of cumulative net revenue over time
SELECT 
    id_pago,
    fecha_pago::date AS fecha,
    comprobante_fiscal,
    monto_neto,
    SUM(monto_neto) OVER (
        ORDER BY fecha_pago 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS ingresos_netos_acumulados
FROM pago
WHERE estado = 'completado'
ORDER BY fecha_pago ASC;

-- 2.5 PostgreSQL DISTINCT ON (...): Fetch the most recent appointment for each patient
-- Instant and optimized query without costly GROUP BY
SELECT DISTINCT ON (t.id_paciente)
    p.dni,
    p.nombre || ' ' || p.apellido AS paciente,
    t.id_turno,
    lower(t.horario_rango) AS fecha_ultimo_turno,
    t.estado AS estado_ultimo_turno,
    'Dr/a. ' || m.apellido AS medico_atendio
FROM turno t
JOIN paciente p ON t.id_paciente = p.id_paciente
JOIN medico m ON t.id_medico = m.id_medico
ORDER BY t.id_paciente, lower(t.horario_rango) DESC;

-- 2.6 Conditional aggregations with PostgreSQL FILTER (WHERE ...)
-- Summary matrix of appointments per physician breaking down attended, canceled, and no-show
SELECT 
    'Dr/a. ' || m.nombre || ' ' || m.apellido AS medico,
    COUNT(*) AS total_turnos_programados,
    COUNT(*) FILTER (WHERE t.estado = 'atendido') AS turnos_atendidos,
    COUNT(*) FILTER (WHERE t.estado = 'cancelado') AS turnos_cancelados,
    COUNT(*) FILTER (WHERE t.estado = 'ausente') AS turnos_ausentes,
    ROUND(
        (COUNT(*) FILTER (WHERE t.estado = 'atendido')::numeric / NULLIF(COUNT(*), 0)) * 100, 
        1
    ) AS efectividad_pct
FROM medico m
LEFT JOIN turno t ON m.id_medico = t.id_medico
GROUP BY m.id_medico, m.nombre, m.apellido
ORDER BY total_turnos_programados DESC;

-- 2.7 Active Admissions and Length of Stay in Days Analysis
-- List active vs completed admissions calculating length of stay in days and accrued cost
SELECT 
    i.id_internacion,
    p.nombre || ' ' || p.apellido AS paciente,
    h.numero AS habitacion,
    h.tipo AS tipo_habitacion,
    i.fecha_ingreso,
    COALESCE(i.fecha_alta, CURRENT_TIMESTAMP) AS fecha_cierre_o_actual,
    ROUND(
        EXTRACT(EPOCH FROM (COALESCE(i.fecha_alta, CURRENT_TIMESTAMP) - i.fecha_ingreso)) / 86400.0,
        1
    ) AS dias_estadia,
    CASE 
        WHEN i.fecha_alta IS NULL THEN 'Internado Actualmente'
        ELSE 'Alta Médica Concedida'
    END AS estado_internacion
FROM internacion i
JOIN paciente p ON i.id_paciente = p.id_paciente
JOIN habitacion h ON i.id_habitacion = h.id_habitacion
ORDER BY i.fecha_ingreso DESC;


-- ============================================================================
-- SECTION 3: ADVANCED LEVEL (POSTGRESQL 18, JSONB, FTS, RECURSION & EXCLUSIONS)
-- ============================================================================

-- 3.1 JSONB Queries: Vital Signs Extraction
-- Locate patients whose blood pressure or heart rate indicates hypertension or tachycardia
SELECT 
    hc.id_historia,
    p.dni,
    p.nombre || ' ' || p.apellido AS paciente,
    hc.fecha_atencion::date AS fecha_consulta,
    hc.signos_vitales->>'presion_arterial' AS presion_arterial,
    (hc.signos_vitales->>'frecuencia_cardiaca_lpm')::int AS fc_lpm,
    (hc.signos_vitales->>'temperatura_c')::numeric AS temperatura_c,
    hc.diagnostico_codigo_cie,
    hc.diagnostico_descripcion
FROM historia_clinica hc
JOIN paciente p ON hc.id_paciente = p.id_paciente
WHERE (hc.signos_vitales->>'frecuencia_cardiaca_lpm')::int >= 80
   OR hc.signos_vitales->>'presion_arterial' LIKE '14%'
ORDER BY fc_lpm DESC;

-- 3.2 Unnesting JSONB Arrays with jsonb_array_elements()
-- List all individually prescribed medications and calculate the most prescribed ones
SELECT 
    medicamento->>'medicamento' AS nombre_medicamento,
    medicamento->>'dosis' AS dosis,
    COUNT(*) AS veces_recetado
FROM historia_clinica hc,
     jsonb_array_elements(hc.receta_medicamentos) AS medicamento
GROUP BY medicamento->>'medicamento', medicamento->>'dosis'
ORDER BY veces_recetado DESC, nombre_medicamento ASC;

-- 3.3 Spanish Full Text Search (FTS) with to_tsquery()
-- Search clinical records containing terms like 'hipertensión', 'bronquial', or 'meniscos'
SELECT 
    hc.id_historia,
    p.nombre || ' ' || p.apellido AS paciente,
    hc.diagnostico_codigo_cie,
    hc.diagnostico_descripcion,
    hc.tratamiento,
    ts_rank(hc.documento_busqueda, to_tsquery('spanish', 'hipertensión | bronquial | meniscos')) AS relevancia
FROM historia_clinica hc
JOIN paciente p ON hc.id_paciente = p.id_paciente
WHERE hc.documento_busqueda @@ to_tsquery('spanish', 'hipertensión | bronquial | meniscos')
ORDER BY relevancia DESC;

-- 3.4 Recursive CTE (WITH RECURSIVE): Org Chart and Medical Hierarchy
-- Traverse the medical chain of command from the General Director down to Residents
WITH RECURSIVE jerarquia_medica AS (
    -- Base Case: Physicians with no direct supervisor (Level 1: Management)
    SELECT 
        m.id_medico,
        m.id_jefe_directo,
        m.nombre || ' ' || m.apellido AS medico,
        m.matricula,
        1 AS nivel_jerarquico,
        CAST(m.nombre || ' ' || m.apellido AS text) AS camino_reporte
    FROM medico m
    WHERE m.id_jefe_directo IS NULL

    UNION ALL

    -- Recursive Case: Subordinates reporting to already-found physicians
    SELECT 
        sub.id_medico,
        sub.id_jefe_directo,
        sub.nombre || ' ' || sub.apellido AS medico,
        sub.matricula,
        jm.nivel_jerarquico + 1,
        jm.camino_reporte || ' -> ' || sub.nombre || ' ' || sub.apellido
    FROM medico sub
    JOIN jerarquia_medica jm ON sub.id_jefe_directo = jm.id_medico
)
SELECT 
    REPEAT('  ', nivel_jerarquico - 1) || '└─ ' || medico AS organigrama,
    matricula,
    nivel_jerarquico,
    camino_reporte
FROM jerarquia_medica
ORDER BY nivel_jerarquico, id_medico;

-- 3.5 Multidimensional Grouping with ROLLUP and CUBE
-- Executive gross billing report grouped by specialty and payment method with subtotals
SELECT 
    COALESCE(e.nombre, '-- TODAS LAS ESPECIALIDADES --') AS especialidad,
    COALESCE(CAST(pg.metodo_pago AS text), '-- TODOS LOS MÉTODOS --') AS metodo_pago,
    COUNT(pg.id_pago) AS cantidad_pagos,
    SUM(pg.monto_bruto) AS total_facturado
FROM pago pg
LEFT JOIN turno t ON pg.id_turno = t.id_turno
LEFT JOIN especialidad e ON t.id_especialidad = e.id_especialidad
WHERE pg.estado = 'completado'
GROUP BY ROLLUP (e.nombre, pg.metodo_pago)
ORDER BY e.nombre NULLS LAST, pg.metodo_pago NULLS LAST;

-- 3.6 Temporal Range Operations (TSTZRANGE): Physician Availability Check
-- Check if Dr. Laura Gómez (id_medico = 2) has any appointment in a specific time slot
SELECT 
    t.id_turno,
    'Dr/a. ' || m.apellido AS medico,
    t.horario_rango,
    t.estado,
    t.horario_rango && tstzrange('2024-02-10 09:15:00-03', '2024-02-10 09:45:00-03', '[)') AS hay_conflicto_solapamiento
FROM turno t
JOIN medico m ON t.id_medico = m.id_medico
WHERE t.id_medico = 2
  AND t.horario_rango && tstzrange('2024-02-10 09:15:00-03', '2024-02-10 09:45:00-03', '[)')
  AND t.estado NOT IN ('cancelado', 'reprogramado');

-- 3.7 Materialized View for Management Board (Clinical Dashboard)
DROP MATERIALIZED VIEW IF EXISTS mv_resumen_medico_mensual;

CREATE MATERIALIZED VIEW mv_resumen_medico_mensual AS
SELECT 
    m.id_medico,
    m.matricula,
    m.nombre || ' ' || m.apellido AS medico,
    DATE_TRUNC('month', lower(t.horario_rango))::date AS mes,
    COUNT(t.id_turno) AS total_citas_programadas,
    COUNT(t.id_turno) FILTER (WHERE t.estado = 'atendido') AS total_citas_atendidas,
    COALESCE(SUM(pg.monto_neto), 0.00) AS recaudacion_neta_total
FROM medico m
LEFT JOIN turno t ON m.id_medico = t.id_medico
LEFT JOIN pago pg ON t.id_turno = pg.id_turno AND pg.estado = 'completado'
GROUP BY m.id_medico, m.matricula, m.nombre, m.apellido, DATE_TRUNC('month', lower(t.horario_rango))
WITH DATA;

-- To refresh the materialized view data:
-- REFRESH MATERIALIZED VIEW mv_resumen_medico_mensual;

SELECT * FROM mv_resumen_medico_mensual ORDER BY mes DESC, recaudacion_neta_total DESC;

-- 3.8 PL/pgSQL Stored Function: Atomic Appointment Registration with Payment
-- This function schedules an appointment and records its payment in a single logical unit of work
CREATE OR REPLACE FUNCTION agendar_turno_con_pago(
    p_id_paciente INT,
    p_id_medico INT,
    p_id_especialidad INT,
    p_id_consultorio INT,
    p_inicio TIMESTAMPTZ,
    p_fin TIMESTAMPTZ,
    p_motivo VARCHAR(250),
    p_metodo_pago metodo_pago_enum
) RETURNS TABLE (nuevo_turno_id INT, nuevo_pago_id INT, monto_abonado NUMERIC) 
LANGUAGE plpgsql AS $$
DECLARE
    v_turno_id INT;
    v_pago_id INT;
    v_precio_base NUMERIC(10,2);
    v_cobertura_pct NUMERIC(5,2);
    v_descuento NUMERIC(10,2);
BEGIN
    -- 1. Get base price of the specialty
    SELECT precio_consulta_base INTO v_precio_base
    FROM especialidad WHERE id_especialidad = p_id_especialidad;

    -- 2. Get patient coverage from their health insurance plan
    SELECT COALESCE(os.porcentaje_cobertura, 0.00) INTO v_cobertura_pct
    FROM paciente p
    LEFT JOIN obra_social os ON p.id_obra_social = os.id_obra_social
    WHERE p.id_paciente = p_id_paciente;

    v_descuento := ROUND((v_precio_base * v_cobertura_pct) / 100.0, 2);

    -- 3. Insert the appointment (GIST constraint will validate if there is a schedule conflict)
    INSERT INTO turno (
        id_paciente, id_medico, id_especialidad, id_consultorio,
        horario_rango, estado, motivo_consulta
    ) VALUES (
        p_id_paciente, p_id_medico, p_id_especialidad, p_id_consultorio,
        tstzrange(p_inicio, p_fin, '[)'), 'confirmado', p_motivo
    ) RETURNING id_turno INTO v_turno_id;

    -- 4. Insert the corresponding payment
    INSERT INTO pago (
        id_paciente, id_turno, id_concepto,
        monto_bruto, descuento_cobertura, metodo_pago, estado, comprobante_fiscal
    ) VALUES (
        p_id_paciente, v_turno_id, 1,
        v_precio_base, v_descuento, p_metodo_pago, 'completado', 'FACT-AUTO-' || v_turno_id
    ) RETURNING id_pago INTO v_pago_id;

    RETURN QUERY SELECT v_turno_id, v_pago_id, (v_precio_base - v_descuento);
END;
$$;

-- Function call demonstration:
-- SELECT * FROM agendar_turno_con_pago(
--     1, 1, 1, 1, 
--     '2026-11-20 09:00:00-03', '2026-11-20 09:30:00-03', 
--     'Consulta preventiva programada', 'efectivo'
-- );

-- ============================================================================
-- END OF PRACTICE QUERY SUITE
-- ============================================================================
