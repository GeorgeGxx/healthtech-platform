-- ============================================================================
-- Dedicated database initialization for Keycloak 26.8.1 on PostgreSQL 18
-- ============================================================================
SELECT 'CREATE DATABASE keycloak' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
