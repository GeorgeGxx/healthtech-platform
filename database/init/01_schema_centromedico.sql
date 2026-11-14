-- ============================================================================
-- MEDICAL CENTER - DDL SCHEMA OPTIMIZED FOR POSTGRESQL 18
-- File: 01_schema_centromedico.sql
-- Description:
--   - Idempotent (cascading DROP IF EXISTS).
--   - Idiomatic PostgreSQL syntax and identifiers (snake_case).
--   - Modern types: GENERATED ALWAYS AS IDENTITY, TIMESTAMPTZ, NUMERIC, JSONB, TSTZRANGE.
--   - Extensions: btree_gist (for ranges and exclusions) and unaccent (text search).
--   - GIST exclusion constraint: prevents overlapping appointments for the same physician.
--   - B-Tree, GIST, and GIN indexes (for JSONB and Spanish Full Text Search).
-- ============================================================================

-- Force UTF8 encoding to avoid accent issues on Windows/PowerShell
SET client_encoding = 'UTF8';
-- Suppress informational notices (NOTICE) from DROP IF EXISTS
SET client_min_messages = warning;

-- ----------------------------------------------------------------------------
-- 1. Required Extensions
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ----------------------------------------------------------------------------
-- 2. Cleanup of Previous Tables and Types (Idempotent Execution)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS pago CASCADE;
DROP TABLE IF EXISTS concepto_pago CASCADE;
DROP TABLE IF EXISTS medicamento CASCADE;
DROP TABLE IF EXISTS internacion CASCADE;
DROP TABLE IF EXISTS habitacion CASCADE;
DROP TABLE IF EXISTS historia_clinica CASCADE;
DROP TABLE IF EXISTS turno CASCADE;
DROP TABLE IF EXISTS consultorio CASCADE;
DROP TABLE IF EXISTS paciente CASCADE;
DROP TABLE IF EXISTS medico_especialidad CASCADE;
DROP TABLE IF EXISTS especialidad CASCADE;
DROP TABLE IF EXISTS medico CASCADE;
DROP TABLE IF EXISTS obra_social CASCADE;
DROP TABLE IF EXISTS pais CASCADE;

DROP TYPE IF EXISTS tipo_habitacion_enum CASCADE;
DROP TYPE IF EXISTS metodo_pago_enum CASCADE;
DROP TYPE IF EXISTS estado_pago_enum CASCADE;
DROP TYPE IF EXISTS estado_turno_enum CASCADE;
DROP TYPE IF EXISTS genero_enum CASCADE;

-- ----------------------------------------------------------------------------
-- 3. Enumerated Types (Native PostgreSQL ENUMs)
-- ----------------------------------------------------------------------------
CREATE TYPE genero_enum AS ENUM ('M', 'F', 'Otro');

CREATE TYPE estado_turno_enum AS ENUM (
    'pendiente',
    'confirmado',
    'atendido',
    'cancelado',
    'ausente',
    'reprogramado'
);

CREATE TYPE estado_pago_enum AS ENUM (
    'pendiente',
    'completado',
    'anulado',
    'reembolsado'
);

CREATE TYPE metodo_pago_enum AS ENUM (
    'efectivo',
    'tarjeta_debito',
    'tarjeta_credito',
    'transferencia',
    'obra_social'
);

CREATE TYPE tipo_habitacion_enum AS ENUM (
    'general',
    'individual',
    'terapia_intensiva',
    'observacion'
);

-- ----------------------------------------------------------------------------
-- 4. Catalog and Base Entity Tables
-- ----------------------------------------------------------------------------

-- Countries
CREATE TABLE pais (
    id_pais       CHAR(3)      NOT NULL PRIMARY KEY,
    nombre        VARCHAR(60)  NOT NULL,
    nacionalidad  VARCHAR(60)  NULL
);

-- Health Insurance Plans / Medical Insurers
CREATE TABLE obra_social (
    id_obra_social       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre               VARCHAR(100) NOT NULL UNIQUE,
    codigo_seguro        VARCHAR(30)  NOT NULL UNIQUE,
    porcentaje_cobertura NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    telefono_contacto    VARCHAR(25)  NULL,
    activo               BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_obra_social_cobertura 
        CHECK (porcentaje_cobertura BETWEEN 0.00 AND 100.00)
);

-- Medical Specialties
CREATE TABLE especialidad (
    id_especialidad      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre               VARCHAR(80)   NOT NULL UNIQUE,
    descripcion          TEXT          NULL,
    precio_consulta_base NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT ck_especialidad_precio 
        CHECK (precio_consulta_base >= 0.00)
);

-- Physical Consulting Rooms
CREATE TABLE consultorio (
    id_consultorio INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo         VARCHAR(15)  NOT NULL UNIQUE, -- E.g.: 'P1-C101'
    piso           SMALLINT     NOT NULL,
    descripcion    VARCHAR(100) NULL
);

-- Physicians (includes hierarchical self-reference for WITH RECURSIVE)
CREATE TABLE medico (
    id_medico        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_jefe_directo  INT          NULL,
    matricula        VARCHAR(25)  NOT NULL UNIQUE,
    nombre           VARCHAR(60)  NOT NULL,
    apellido         VARCHAR(60)  NOT NULL,
    email            VARCHAR(100) NOT NULL UNIQUE,
    telefono         VARCHAR(25)  NULL,
    fecha_ingreso    DATE         NOT NULL DEFAULT CURRENT_DATE,
    activo           BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_medico_jefe 
        FOREIGN KEY (id_jefe_directo) REFERENCES medico(id_medico) 
        ON DELETE SET NULL
);
CREATE INDEX ix_medico_jefe ON medico(id_jefe_directo);

-- N:M Relationship Physicians - Specialties
CREATE TABLE medico_especialidad (
    id_medico        INT     NOT NULL,
    id_especialidad  INT     NOT NULL,
    es_principal     BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_medico_especialidad 
        PRIMARY KEY (id_medico, id_especialidad),
    CONSTRAINT fk_medicoesp_medico 
        FOREIGN KEY (id_medico) REFERENCES medico(id_medico) 
        ON DELETE CASCADE,
    CONSTRAINT fk_medicoesp_especialidad 
        FOREIGN KEY (id_especialidad) REFERENCES especialidad(id_especialidad) 
        ON DELETE RESTRICT
);
CREATE INDEX ix_medico_especialidad_esp ON medico_especialidad(id_especialidad);

-- Patients
CREATE TABLE paciente (
    id_paciente      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dni              VARCHAR(20)  NOT NULL UNIQUE,
    nombre           VARCHAR(60)  NOT NULL,
    apellido         VARCHAR(60)  NOT NULL,
    genero           genero_enum  NOT NULL,
    fecha_nacimiento DATE         NOT NULL,
    id_pais          CHAR(3)      NOT NULL DEFAULT 'ARG',
    id_obra_social   INT          NULL,
    numero_afiliado  VARCHAR(30)  NULL,
    domicilio        VARCHAR(150) NULL,
    telefono         VARCHAR(25)  NULL,
    email            VARCHAR(100) NULL,
    fecha_registro   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_paciente_pais 
        FOREIGN KEY (id_pais) REFERENCES pais(id_pais),
    CONSTRAINT fk_paciente_obra_social 
        FOREIGN KEY (id_obra_social) REFERENCES obra_social(id_obra_social) 
        ON DELETE SET NULL,
    CONSTRAINT ck_paciente_f_nacimiento 
        CHECK (fecha_nacimiento <= CURRENT_DATE)
);
CREATE INDEX ix_paciente_pais ON paciente(id_pais);
CREATE INDEX ix_paciente_obra_social ON paciente(id_obra_social);
CREATE INDEX ix_paciente_apellido_nombre ON paciente(apellido, nombre);

-- ----------------------------------------------------------------------------
-- 5. Medical Appointments with GIST Exclusion Constraint
-- ----------------------------------------------------------------------------
CREATE TABLE turno (
    id_turno         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_paciente      INT                NOT NULL,
    id_medico        INT                NOT NULL,
    id_especialidad  INT                NOT NULL,
    id_consultorio   INT                NULL,
    horario_rango    TSTZRANGE          NOT NULL, -- Range [start, end)
    estado           estado_turno_enum  NOT NULL DEFAULT 'pendiente',
    motivo_consulta  VARCHAR(250)       NULL,
    observaciones    TEXT               NULL,
    fecha_creacion   TIMESTAMPTZ        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_turno_paciente 
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_turno_medico 
        FOREIGN KEY (id_medico) REFERENCES medico(id_medico) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_turno_especialidad 
        FOREIGN KEY (id_especialidad) REFERENCES especialidad(id_especialidad) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_turno_consultorio 
        FOREIGN KEY (id_consultorio) REFERENCES consultorio(id_consultorio) 
        ON DELETE SET NULL,
    -- PostgreSQL Exclusion: Prevents the same physician from having 2 overlapping appointments
    -- except when the appointment is canceled or rescheduled
    CONSTRAINT uq_medico_no_solapamiento 
        EXCLUDE USING gist (
            id_medico WITH =, 
            horario_rango WITH &&
        ) WHERE (estado NOT IN ('cancelado', 'reprogramado'))
);
CREATE INDEX ix_turno_paciente ON turno(id_paciente);
CREATE INDEX ix_turno_medico ON turno(id_medico);
CREATE INDEX ix_turno_horario ON turno USING gist(horario_rango);
CREATE INDEX ix_turno_estado ON turno(estado);

-- ----------------------------------------------------------------------------
-- 6. Clinical Records (with JSONB and Full Text Search)
-- ----------------------------------------------------------------------------
CREATE TABLE historia_clinica (
    id_historia             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_paciente             INT          NOT NULL,
    id_medico               INT          NOT NULL,
    id_turno                INT          NULL UNIQUE,
    fecha_atencion          TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    diagnostico_codigo_cie  VARCHAR(10)  NULL, -- E.g.: 'I10', 'E11.9', 'J00'
    diagnostico_descripcion TEXT         NOT NULL,
    tratamiento             TEXT         NULL,
    -- JSONB: Stores vital signs with a flexible structure
    -- Example: {"presion": "120/80", "pulso_lpm": 72, "temperatura_c": 36.5, "peso_kg": 74.2}
    signos_vitales          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    -- JSONB: List of prescribed medications
    -- Example: [{"medicamento": "Losartan", "dosis": "50mg", "frecuencia": "cada 24 horas", "dias": 30}]
    receta_medicamentos     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    -- Generated column for Spanish full-text search
    documento_busqueda      TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('spanish', 
            coalesce(diagnostico_descripcion, '') || ' ' || 
            coalesce(tratamiento, '')
        )
    ) STORED,
    CONSTRAINT fk_historia_paciente 
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_historia_medico 
        FOREIGN KEY (id_medico) REFERENCES medico(id_medico) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_historia_turno 
        FOREIGN KEY (id_turno) REFERENCES turno(id_turno) 
        ON DELETE SET NULL
);
CREATE INDEX ix_historia_paciente ON historia_clinica(id_paciente);
CREATE INDEX ix_historia_medico ON historia_clinica(id_medico);
CREATE INDEX ix_historia_fecha ON historia_clinica(fecha_atencion);
CREATE INDEX ix_historia_signos_gin ON historia_clinica USING gin(signos_vitales);
CREATE INDEX ix_historia_receta_gin ON historia_clinica USING gin(receta_medicamentos);
CREATE INDEX ix_historia_fts_gin ON historia_clinica USING gin(documento_busqueda);

-- ----------------------------------------------------------------------------
-- 7. Hospital Rooms and Admissions
-- ----------------------------------------------------------------------------
CREATE TABLE habitacion (
    id_habitacion INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero        VARCHAR(15)          NOT NULL UNIQUE,
    tipo          tipo_habitacion_enum NOT NULL DEFAULT 'general',
    piso          SMALLINT             NOT NULL,
    costo_dia     NUMERIC(10,2)        NOT NULL CHECK (costo_dia >= 0.00),
    activa        BOOLEAN              NOT NULL DEFAULT TRUE
);

CREATE TABLE internacion (
    id_internacion         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_paciente            INT           NOT NULL,
    id_medico_responsable  INT           NOT NULL,
    id_habitacion          INT           NOT NULL,
    fecha_ingreso          TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_alta             TIMESTAMPTZ   NULL,
    diagnostico_ingreso    TEXT          NOT NULL,
    motivo_alta            TEXT          NULL,
    costo_total_estimado   NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_internacion_paciente 
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_internacion_medico 
        FOREIGN KEY (id_medico_responsable) REFERENCES medico(id_medico) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_internacion_habitacion 
        FOREIGN KEY (id_habitacion) REFERENCES habitacion(id_habitacion) 
        ON DELETE RESTRICT,
    CONSTRAINT ck_internacion_fechas 
        CHECK (fecha_alta IS NULL OR fecha_alta >= fecha_ingreso),
    CONSTRAINT ck_internacion_costo 
        CHECK (costo_total_estimado >= 0.00)
);
CREATE INDEX ix_internacion_paciente ON internacion(id_paciente);
CREATE INDEX ix_internacion_medico ON internacion(id_medico_responsable);
CREATE INDEX ix_internacion_habitacion ON internacion(id_habitacion);
CREATE INDEX ix_internacion_activa ON internacion(fecha_ingreso) WHERE fecha_alta IS NULL;

-- ----------------------------------------------------------------------------
-- 8. Billing and Payments
-- ----------------------------------------------------------------------------
CREATE TABLE concepto_pago (
    id_concepto INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(80)  NOT NULL UNIQUE,
    descripcion VARCHAR(150) NULL
);

CREATE TABLE pago (
    id_pago             INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_paciente         INT              NOT NULL,
    id_turno            INT              NULL,
    id_internacion      INT              NULL,
    id_concepto         INT              NOT NULL,
    fecha_pago          TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto_bruto         NUMERIC(10,2)    NOT NULL,
    descuento_cobertura NUMERIC(10,2)    NOT NULL DEFAULT 0.00,
    -- Computed/stored column for PostgreSQL 18
    monto_neto          NUMERIC(10,2)    GENERATED ALWAYS AS (monto_bruto - descuento_cobertura) STORED,
    metodo_pago         metodo_pago_enum NOT NULL,
    estado              estado_pago_enum NOT NULL DEFAULT 'completado',
    comprobante_fiscal  VARCHAR(50)      NULL UNIQUE,
    detalles_transaccion JSONB           NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT fk_pago_paciente 
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_pago_turno 
        FOREIGN KEY (id_turno) REFERENCES turno(id_turno) 
        ON DELETE SET NULL,
    CONSTRAINT fk_pago_internacion 
        FOREIGN KEY (id_internacion) REFERENCES internacion(id_internacion) 
        ON DELETE SET NULL,
    CONSTRAINT fk_pago_concepto 
        FOREIGN KEY (id_concepto) REFERENCES concepto_pago(id_concepto) 
        ON DELETE RESTRICT,
    CONSTRAINT ck_pago_monto_bruto 
        CHECK (monto_bruto >= 0.00),
    CONSTRAINT ck_pago_descuento 
        CHECK (descuento_cobertura >= 0.00 AND descuento_cobertura <= monto_bruto)
);
CREATE INDEX ix_pago_paciente ON pago(id_paciente);
CREATE INDEX ix_pago_turno ON pago(id_turno);
CREATE INDEX ix_pago_internacion ON pago(id_internacion);
CREATE INDEX ix_pago_fecha ON pago(fecha_pago);
CREATE INDEX ix_pago_estado ON pago(estado);

-- ----------------------------------------------------------------------------
-- 9. Pharmacy Catalog and Medication Stock
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medicamento (
    id_medicamento        VARCHAR(20)    PRIMARY KEY,
    nombre_comercial      VARCHAR(120)   NOT NULL,
    principio_activo      VARCHAR(120)   NOT NULL,
    categoria_terapeutica VARCHAR(80)    NOT NULL,
    presentacion          VARCHAR(120)   NOT NULL,
    lote                  VARCHAR(40)    NOT NULL,
    caducidad             DATE           NOT NULL,
    stock_actual          INT            NOT NULL CHECK (stock_actual >= 0),
    stock_minimo          INT            NOT NULL CHECK (stock_minimo >= 0),
    stock_maximo          INT            NOT NULL CHECK (stock_maximo >= stock_minimo),
    nivel_alerta          VARCHAR(20)    NOT NULL DEFAULT 'Normal',
    ubicacion_almacen     VARCHAR(80)    NOT NULL,
    precio_unitario_mxn   NUMERIC(10,2)  NOT NULL CHECK (precio_unitario_mxn >= 0.00),
    activo                BOOLEAN        NOT NULL DEFAULT TRUE
);
CREATE INDEX ix_medicamento_categoria ON medicamento(categoria_terapeutica);
CREATE INDEX ix_medicamento_alerta ON medicamento(nivel_alerta);

-- ----------------------------------------------------------------------------
-- 10. PHI Access Traceability & Audit (HIPAA § 164.312 & NOM-024-SSA3-2012)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registro_auditoria (
    id_auditoria   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id     VARCHAR(100) NOT NULL DEFAULT 'system',
    nombre_usuario VARCHAR(150) NOT NULL DEFAULT 'Usuario Hospitalario',
    rol            VARCHAR(50)  NOT NULL DEFAULT 'doctor_user',
    accion         VARCHAR(50)  NOT NULL, -- 'LECTURA_EXPEDIENTE', 'CREACION_RECETA', etc.
    entidad        VARCHAR(60)  NOT NULL, -- 'historia_clinica', 'paciente', 'internacion', 'pago'
    id_entidad     VARCHAR(100) NULL,
    ip_cliente     VARCHAR(45)  NULL,
    user_agent     TEXT         NULL,
    metadatos      JSONB        NULL DEFAULT '{}'::jsonb,
    fecha_hora     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_auditoria_entidad ON registro_auditoria(entidad, id_entidad);
CREATE INDEX ix_auditoria_fecha ON registro_auditoria(fecha_hora);
CREATE INDEX ix_auditoria_usuario ON registro_auditoria(usuario_id);

-- ============================================================================
-- END OF DDL SCHEMA
-- ============================================================================
