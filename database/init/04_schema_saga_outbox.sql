-- ============================================================================
-- NATIONAL MEDICAL CENTER - ORCHESTRATED SAGA & TRANSACTIONAL OUTBOX SCHEMA
-- File: 04_schema_saga_outbox.sql
-- Optimized for PostgreSQL 18: UUID v4, JSONB, Timestamptz, and Concurrency Indexes
-- ============================================================================

SET client_encoding = 'UTF8';
SET client_min_messages = warning;

-- ----------------------------------------------------------------------------
-- 1. Outbox Events Table (At-Least-Once Delivery Guarantee without Dual-Write)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outbox_evento (
    id_evento       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agregado_tipo   VARCHAR(60) NOT NULL,              -- 'Turno', 'Pago', 'Medicamento', 'Internacion'
    agregado_id     VARCHAR(100) NOT NULL,             -- Entity ID
    tipo_evento     VARCHAR(100) NOT NULL,             -- 'appointment.created', 'payment.received', etc.
    topico          VARCHAR(100) NOT NULL,             -- Target Kafka topic
    payload         JSONB NOT NULL,                    -- Event data
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,-- traceId, spanId, sagaId, correlationId
    estado          VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- 'PENDIENTE', 'PUBLICADO', 'FALLIDO'
    intentos        INT NOT NULL DEFAULT 0,
    error_detalle   TEXT NULL,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    procesado_en    TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS ix_outbox_estado ON outbox_evento(estado, creado_en);
CREATE INDEX IF NOT EXISTS ix_outbox_agregado ON outbox_evento(agregado_tipo, agregado_id);

-- ----------------------------------------------------------------------------
-- 2. Orchestrated Saga Instances Table (Saga Execution Coordinator - SEC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS instancia_saga (
    id_saga                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_saga             VARCHAR(100) NOT NULL,           -- 'AppointmentBookingSaga', 'HospitalAdmissionSaga'
    estado                  VARCHAR(30) NOT NULL DEFAULT 'INICIADA', -- 'INICIADA', 'EN_PROCESO', 'COMPLETADA', 'COMPENSANDO', 'COMPENSADA', 'FALLIDA'
    paso_actual             INT NOT NULL DEFAULT 1,
    total_pasos             INT NOT NULL DEFAULT 1,
    datos_contexto          JSONB NOT NULL DEFAULT '{}'::jsonb, -- Full transaction payload
    historial_pasos         JSONB NOT NULL DEFAULT '[]'::jsonb, -- Sequential step execution log
    compensacion_requerida  BOOLEAN NOT NULL DEFAULT FALSE,
    error_detalle           TEXT NULL,
    iniciado_en             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_saga_estado ON instancia_saga(estado);
CREATE INDEX IF NOT EXISTS ix_saga_nombre ON instancia_saga(nombre_saga);
CREATE INDEX IF NOT EXISTS ix_saga_fecha ON instancia_saga(iniciado_en);
