-- ============================================================================
-- DISPOSABLE DEVELOPMENT RESET SCRIPT (NEVER RUN IN PRODUCTION)
-- ============================================================================
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
