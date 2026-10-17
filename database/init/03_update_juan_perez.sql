UPDATE paciente 
SET dni = '28456123', 
    nombre = 'Juan', 
    apellido = 'Pérez García', 
    genero = 'M', 
    fecha_nacimiento = '1985-05-14', 
    id_pais = 'MEX', 
    id_obra_social = 1, 
    numero_afiliado = 'OSDE-88992', 
    domicilio = 'Av. Insurgentes Sur 1450, CDMX', 
    telefono = '+52 55 1234-5678', 
    email = 'juan.perez@email.com' 
WHERE id_paciente = 1;

UPDATE historia_clinica 
SET diagnostico_codigo_cie = 'I10', 
    diagnostico_descripcion = 'Hipertensión arterial primaria controlada - Consulta de seguimiento', 
    tratamiento = 'Continuar esquema con Losartán 50mg cada 12 horas. Mantener control de sodio en dieta y registro tensional.', 
    signos_vitales = '{"presion_arterial": "125/80", "frecuencia_cardiaca_lpm": 72, "temperatura_c": 36.5, "peso_kg": 78.5, "talla_cm": 176, "oxigeno_pct": 99}'::jsonb, 
    receta_medicamentos = '[{"medicamento": "Losartán", "dosis": "50mg", "frecuencia": "cada 12 horas", "dias": 30}, {"medicamento": "Aspirina Protect", "dosis": "100mg", "frecuencia": "cada 24 horas", "dias": 30}]'::jsonb 
WHERE id_paciente = 1;

UPDATE turno 
SET motivo_consulta = 'Control periódico de cardiología y evaluación de presión arterial' 
WHERE id_paciente = 1;
