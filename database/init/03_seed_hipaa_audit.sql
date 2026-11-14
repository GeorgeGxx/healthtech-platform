-- ============================================================================
-- MEDICAL CENTER - HIPAA SECURITY AUDIT EVENTS (NOM-024)
-- File: 03_seed_hipaa_audit.sql
-- ============================================================================

INSERT INTO registro_auditoria (usuario_id, nombre_usuario, rol, accion, entidad, id_entidad, ip_cliente, user_agent, metadatos, fecha_hora) VALUES
  ('usr-recep-01', 'María González', 'admin_user', 'LOGIN_EXITOSO', 'auth', 'admin_user', '192.168.1.120', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"metodo": "keycloak_oidc", "sesion_id": "sess_88912"}'::jsonb, '2026-10-17 08:00:15-06'),
  ('usr-recep-01', 'María González', 'admin_user', 'CONSULTA_PHI', 'patients', '4', '192.168.1.120', 'HealthTech Angular/21', '{"paciente": "Carlos Ramírez", "motivo": "agendamiento_cita"}'::jsonb, '2026-10-17 08:05:22-06'),
  ('usr-recep-01', 'María González', 'admin_user', 'ASIGNACION_CAMA', 'internacion', '2', '192.168.1.120', 'HealthTech Angular/21', '{"habitacion": "HAB-102", "paciente": "Carlos López"}'::jsonb, '2026-10-17 08:15:00-06'),
  ('dr-arevalo', 'Dr. Alberto Arévalo', 'doctor_user', 'LOGIN_EXITOSO', 'auth', 'dr-arevalo', '192.168.1.145', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"mfa_verificado": true}'::jsonb, '2026-10-17 08:20:10-06'),
  ('dr-arevalo', 'Dr. Alberto Arévalo', 'doctor_user', 'CONSULTA_PHI', 'medical-records', '3', '192.168.1.145', 'HealthTech Angular/21', '{"tipo_consulta": "traumatologia", "paciente_id": 3}'::jsonb, '2026-10-17 08:30:45-06'),
  ('dr-arevalo', 'Dr. Alberto Arévalo', 'doctor_user', 'MODIFICACION_PHI', 'medical-records', '3', '192.168.1.145', 'HealthTech Angular/21', '{"campo": "evolucion_clinica", "diagnostico": "Esguince de tobillo"}'::jsonb, '2026-10-17 08:45:12-06'),
  ('dr-arevalo', 'Dr. Alberto Arévalo', 'doctor_user', 'EMISION_RECETA', 'pharmacy', 'MED-002', '192.168.1.145', 'HealthTech Angular/21', '{"medicamento": "Dolac Inyectable", "dosis": "30mg c/8h"}'::jsonb, '2026-10-17 08:48:00-06'),
  ('dra-gomez', 'Dra. Laura Gómez', 'doctor_user', 'LOGIN_EXITOSO', 'auth', 'dra-gomez', '192.168.1.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"mfa_verificado": true}'::jsonb, '2026-10-17 09:00:05-06'),
  ('dra-gomez', 'Dra. Laura Gómez', 'doctor_user', 'CONSULTA_PHI', 'medical-records', '7', '192.168.1.148', 'HealthTech Angular/21', '{"paciente": "Beatriz Fernández", "protocolo": "control_pami"}'::jsonb, '2026-10-17 09:12:30-06'),
  ('usr-caja-01', 'Roberto Salazar', 'admin_user', 'COBRO_FACTURA', 'billing', 'FACT-A-0001', '192.168.1.130', 'HealthTech Angular/21', '{"monto_bruto": 25000, "cobertura_osde": 20000, "copago": 5000}'::jsonb, '2026-10-17 09:35:00-06'),
  ('usr-unknown', 'Desconocido', 'unauthenticated', 'LOGIN_FALLIDO', 'auth', 'admin_root', '189.204.112.5', 'Python-urllib/3.10', '{"motivo": "credenciales_invalidas", "alerta": "posible_fuerza_bruta"}'::jsonb, '2026-10-17 10:14:22-06'),
  ('usr-unknown', 'Desconocido', 'unauthenticated', 'LOGIN_BLOQUEADO', 'auth', 'admin_root', '189.204.112.5', 'Python-urllib/3.10', '{"motivo": "ip_temporalmente_bloqueada", "intentos": 5}'::jsonb, '2026-10-17 10:14:35-06'),
  ('usr-pac-01', 'Juan Pérez García', 'basic_user', 'LOGIN_EXITOSO', 'auth', 'juan.perez', '201.144.35.88', 'Mobile Safari / iOS 18', '{"origen": "portal_paciente"}'::jsonb, '2026-10-17 10:30:00-06'),
  ('usr-pac-01', 'Juan Pérez García', 'basic_user', 'CONSULTA_PHI', 'medical-records', '1', '201.144.35.88', 'Mobile Safari / iOS 18', '{"recurso": "mis_recetas_activas", "filtro": "solo_propio"}'::jsonb, '2026-10-17 10:32:15-06'),
  ('usr-recep-01', 'María González', 'admin_user', 'AUTO_LOGOUT_HIPAA', 'auth', 'admin_user', '192.168.1.120', 'HealthTech Angular/21', '{"motivo": "inactividad_15_minutos", "norma": "HIPAA 164.312"}'::jsonb, '2026-10-17 11:15:00-06'),
  ('dr-navarro', 'Dra. Sofía Navarro', 'doctor_user', 'LOGIN_EXITOSO', 'auth', 'dr-navarro', '192.168.1.150', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '{"especialidad": "pediatria"}'::jsonb, '2026-10-17 11:30:10-06'),
  ('dr-navarro', 'Dra. Sofía Navarro', 'doctor_user', 'CONSULTA_PHI', 'patients', '1', '192.168.1.150', 'HealthTech Angular/21', '{"paciente": "Juan Pérez García", "modulo": "pediatria"}'::jsonb, '2026-10-17 11:45:00-06'),
  ('usr-caja-01', 'Roberto Salazar', 'admin_user', 'COBRO_FACTURA', 'billing', 'FACT-A-0008', '192.168.1.130', 'HealthTech Angular/21', '{"monto_bruto": 1120000, "concepto": "Liquidacion internacion UTI"}'::jsonb, '2026-10-17 13:00:00-06'),
  ('dr-arevalo', 'Dr. Alberto Arévalo', 'doctor_user', 'CONSULTA_PHI', 'internacion', '2', '192.168.1.145', 'HealthTech Angular/21', '{"paciente": "Carlos López", "habitacion": "HAB-102"}'::jsonb, '2026-10-17 14:10:00-06'),
  ('dr-arevalo', 'Dr. Alberto Arévalo', 'doctor_user', 'EMISION_RECETA', 'pharmacy', 'MED-004', '192.168.1.145', 'HealthTech Angular/21', '{"medicamento": "Morfina Solución IV", "controlado": true, "area": "UTI"}'::jsonb, '2026-10-17 14:15:30-06');
