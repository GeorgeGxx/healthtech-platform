import { describe, it, expect } from 'vitest';
import { FhirPatientMapper } from './fhir-patient.mapper.js';
import type { Paciente } from '../entities/paciente.entity.js';

describe('FhirPatientMapper', () => {
  it('maps a Patient entity to a valid HL7 FHIR R4 Patient resource', () => {
    const paciente = {
      idPaciente: 42,
      dni: '40111222',
      nombre: 'Ana',
      apellido: 'García',
      genero: 'F',
      fechaNacimiento: new Date('1990-05-15'),
      telefono: '+52 55 1234 5678',
      email: 'ana@example.com',
      domicilio: 'Av. Reforma 100',
      idPais: 'MEX',
      numeroAfiliado: 'AF-9988',
    } as unknown as Paciente;

    const fhir = FhirPatientMapper.toFhir(paciente);

    expect(fhir.resourceType).toBe('Patient');
    expect(fhir.id).toBe('42');
    expect(fhir.gender).toBe('female');
    expect(fhir.name[0]?.family).toBe('García');
    expect(fhir.name[0]?.given).toEqual(['Ana']);
    expect(fhir.identifier).toHaveLength(2);
    expect(fhir.telecom.map((t) => t.system)).toEqual(['phone', 'email']);
  });
});
