-- ============================================================================
-- NATIONAL MEDICAL CENTER - SCHEMA-PER-SERVICE ISOLATION & ROLES (PHASE 3)
-- File: 05_schema_service_isolation.sql
-- Optimized for PostgreSQL 18: Logical Isolation by Bounded Context
-- ============================================================================

SET client_encoding = 'UTF8';
SET client_min_messages = warning;

-- ----------------------------------------------------------------------------
-- 1. Logical Schema Creation per Microservice
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS appointments;
CREATE SCHEMA IF NOT EXISTS patients;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS pharmacy;
CREATE SCHEMA IF NOT EXISTS clinical;
CREATE SCHEMA IF NOT EXISTS telemedicine;
CREATE SCHEMA IF NOT EXISTS core;

-- ----------------------------------------------------------------------------
-- 2. Decoupled Read Views per Microservice (Read Projections)
-- ----------------------------------------------------------------------------

-- View for appointment-service: reads only essential physician and room data
CREATE OR REPLACE VIEW appointments.v_medicos_activos AS
SELECT 
    m.id_medico,
    m.nombre,
    m.apellido,
    m.matricula,
    e.id_especialidad,
    e.nombre AS especialidad_nombre
FROM public.medico m
JOIN public.medico_especialidad me ON m.id_medico = me.id_medico
JOIN public.especialidad e ON me.id_especialidad = e.id_especialidad
WHERE m.activo = TRUE;

-- View for patient-service: public health insurance coverage catalogs
CREATE OR REPLACE VIEW patients.v_coberturas_vigentes AS
SELECT 
    id_obra_social,
    nombre,
    codigo_seguro,
    porcentaje_cobertura
FROM public.obra_social
WHERE activo = TRUE;

-- ----------------------------------------------------------------------------
-- 3. Saga Transaction Log & Dead-Letter Queue (Forensic Audit)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications.bitacora_dlq (
    id_dlq         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_evento      VARCHAR(100) NOT NULL,
    tipo_evento    VARCHAR(100) NOT NULL,
    canal          VARCHAR(30) NOT NULL,
    destinatario   VARCHAR(150) NOT NULL,
    error_causa    TEXT NOT NULL,
    reintentos     INT NOT NULL DEFAULT 1,
    resuelto       BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resuelto_en    TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS ix_dlq_evento ON notifications.bitacora_dlq(id_evento);
CREATE INDEX IF NOT EXISTS ix_dlq_resuelto ON notifications.bitacora_dlq(resuelto);

-- ----------------------------------------------------------------------------
-- 4. Telemedicine: Virtual Rooms & WebRTC Sessions (Pillar 4)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemedicine.sala_virtual (
    id_sala         VARCHAR(64) PRIMARY KEY,
    id_turno        INT NOT NULL UNIQUE,
    id_medico       INT NOT NULL,
    id_paciente     INT NOT NULL,
    token_medico    VARCHAR(128) NOT NULL,
    token_paciente  VARCHAR(128) NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'CREADA', -- CREADA, EN_CURSO, FINALIZADA, EXPIRADA
    expira_en       TIMESTAMPTZ NOT NULL,
    creada_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_telemedicina_turno ON telemedicine.sala_virtual(id_turno);

-- ----------------------------------------------------------------------------
-- 5. Electronic Health Record: Cryptographic Digital Prescriptions with QR (Pillar 2)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.receta_digital (
    id_receta       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_verif    VARCHAR(64) NOT NULL UNIQUE,
    id_paciente     INT NOT NULL,
    id_medico       INT NOT NULL,
    diagnostico     TEXT NOT NULL,
    medicamentos    JSONB NOT NULL,
    firma_digital   VARCHAR(128) NOT NULL,
    vigencia_dias   INT NOT NULL DEFAULT 30,
    estado          VARCHAR(20) NOT NULL DEFAULT 'EMITIDA', -- EMITIDA, DISPENSADA, VENCIDA
    emitida_en      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dispensada_en   TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS ix_receta_codigo ON clinical.receta_digital(codigo_verif);
CREATE INDEX IF NOT EXISTS ix_receta_paciente ON clinical.receta_digital(id_paciente);

-- ----------------------------------------------------------------------------
-- 6. Cashier & Billing: Physician Fee Settlements (Pillar 4)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing.liquidacion_medico (
    id_liquidacion     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_medico          INT NOT NULL,
    periodo            VARCHAR(7) NOT NULL, -- YYYY-MM
    total_consultas    INT NOT NULL DEFAULT 0,
    consultas_asistidas INT NOT NULL DEFAULT 0,
    consultas_canceladas INT NOT NULL DEFAULT 0,
    monto_bruto        NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    comision_clinica   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monto_neto_medico  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estado             VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, LIQUIDADO, PAGADO
    calculado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_liq_medico_periodo ON billing.liquidacion_medico(id_medico, periodo);
