-- ============================================================================
-- HEALTH-TECH PLATFORM - ADDITIVE MIGRATIONS, INVARIANTS & LEAST-PRIVILEGE ROLES
-- File: 06_migrations_and_invariants.sql
-- ============================================================================

SET client_encoding = 'UTF8';

-- 1. Partial Unique Indexes for Critical Business Invariants
CREATE UNIQUE INDEX IF NOT EXISTS uq_internacion_habitacion_activa
    ON internacion (id_habitacion)
    WHERE fecha_alta IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pago_idempotency_key
    ON pago ((detalles_transaccion->>'idempotencyKey'))
    WHERE detalles_transaccion->>'idempotencyKey' IS NOT NULL;

-- 2. Immutable Clinical Record Version / Addenda History
CREATE SCHEMA IF NOT EXISTS clinical;
CREATE TABLE IF NOT EXISTS clinical.historia_clinica_version (
    id_version              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_historia             INT NOT NULL REFERENCES historia_clinica(id_historia) ON DELETE RESTRICT,
    version_num             INT NOT NULL,
    author_id               VARCHAR(150) NOT NULL,
    author_name             VARCHAR(150) NOT NULL,
    author_role             VARCHAR(80) NOT NULL,
    diagnostico_codigo_cie  VARCHAR(15) NULL,
    diagnostico_descripcion TEXT NOT NULL,
    tratamiento             TEXT NULL,
    signos_vitales          JSONB NOT NULL DEFAULT '{}'::jsonb,
    receta_medicamentos     JSONB NOT NULL DEFAULT '[]'::jsonb,
    change_reason           VARCHAR(255) NOT NULL DEFAULT 'Clinical addendum',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (id_historia, version_num)
);

-- 3. Pharmacy Inventory Movement Ledger with Idempotency Key
CREATE SCHEMA IF NOT EXISTS pharmacy;
CREATE TABLE IF NOT EXISTS pharmacy.movimiento_inventario (
    id_movimiento     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_medicamento    VARCHAR(64) NOT NULL,
    tipo_movimiento   VARCHAR(32) NOT NULL CHECK (tipo_movimiento IN ('DISPENSACION', 'AJUSTE', 'REPOSICION')),
    cantidad          INT NOT NULL,
    stock_anterior    INT NOT NULL CHECK (stock_anterior >= 0),
    stock_nuevo       INT NOT NULL CHECK (stock_nuevo >= 0),
    lote              VARCHAR(80) NULL,
    fecha_vencimiento DATE NULL,
    actor_id          VARCHAR(150) NOT NULL DEFAULT 'system',
    motivo            VARCHAR(255) NULL,
    idempotency_key   VARCHAR(128) NULL UNIQUE,
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Durable Notification History & Delivery State Persistence
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE TABLE IF NOT EXISTS notifications.notificacion (
    id_notificacion   VARCHAR(128) PRIMARY KEY,
    event_id          VARCHAR(128) NOT NULL,
    canal             VARCHAR(24) NOT NULL CHECK (canal IN ('EMAIL', 'SMS', 'WHATSAPP', 'IN_APP')),
    destinatario      VARCHAR(255) NOT NULL,
    asunto            VARCHAR(255) NOT NULL,
    contenido         TEXT NOT NULL,
    estado            VARCHAR(32) NOT NULL CHECK (estado IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'RETRYING', 'DEAD_LETTERED', 'SIMULATED', 'UNAVAILABLE', 'DUPLICADO_IGNORADO')),
    metadatos         JSONB NOT NULL DEFAULT '{}'::jsonb,
    enviado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, canal)
);

-- 5. Least-Privilege Service Roles (NOLOGIN templates; assign passwords via Key Vault in prod)
DO $$
DECLARE
    role_name TEXT;
BEGIN
    FOREACH role_name IN ARRAY ARRAY[
        'svc_appointments',
        'svc_patients',
        'svc_clinical',
        'svc_billing',
        'svc_pharmacy',
        'svc_staff',
        'svc_notifications'
    ]
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE', role_name);
        END IF;
    END LOOP;
END $$;

GRANT USAGE ON SCHEMA appointments, telemedicine TO svc_appointments;
GRANT USAGE ON SCHEMA patients TO svc_patients;
GRANT USAGE ON SCHEMA clinical TO svc_clinical;
GRANT USAGE ON SCHEMA billing TO svc_billing;
GRANT USAGE ON SCHEMA pharmacy TO svc_pharmacy;
GRANT USAGE ON SCHEMA notifications TO svc_notifications;

GRANT SELECT, INSERT, UPDATE ON clinical.historia_clinica_version TO svc_clinical;
GRANT SELECT, INSERT ON pharmacy.movimiento_inventario TO svc_pharmacy;
GRANT SELECT, INSERT, UPDATE ON notifications.notificacion TO svc_notifications;
