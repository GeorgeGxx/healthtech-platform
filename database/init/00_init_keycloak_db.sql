-- ============================================================================
-- Inicialización de base de datos dedicada para Keycloak 26.8.1 en PostgreSQL 18
-- ============================================================================
SELECT 'CREATE DATABASE keycloak' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
