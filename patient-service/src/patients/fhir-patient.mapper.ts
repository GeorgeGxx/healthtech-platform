import { Paciente } from '../entities/paciente.entity.js';

export interface FhirIdentifier {
  system: string;
  value: string;
  use?: string;
}

export interface FhirHumanName {
  use: string;
  family: string;
  given: string[];
}

export interface FhirContactPoint {
  system: 'phone' | 'email' | 'url';
  value: string;
  use: 'home' | 'work' | 'mobile';
}

export interface FhirAddress {
  use: string;
  line: string[];
  country?: string;
}

export interface FhirPatientResource {
  resourceType: 'Patient';
  id: string;
  identifier: FhirIdentifier[];
  active: boolean;
  name: FhirHumanName[];
  telecom: FhirContactPoint[];
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: FhirAddress[];
  managingOrganization?: {
    display: string;
  };
}

export interface FhirBundle<T> {
  resourceType: 'Bundle';
  type: 'searchset';
  total: number;
  entry: Array<{
    fullUrl: string;
    resource: T;
  }>;
}

export class FhirPatientMapper {
  static toFhir(p: Paciente): FhirPatientResource {
    let fhirGender: 'male' | 'female' | 'other' | 'unknown' = 'unknown';
    const g = (p.genero || '').toUpperCase();
    if (g === 'M' || g === 'MASCULINO') fhirGender = 'male';
    else if (g === 'F' || g === 'FEMENINO') fhirGender = 'female';
    else if (g === 'OTRO') fhirGender = 'other';

    const telecom: FhirContactPoint[] = [];
    if (p.telefono) {
      telecom.push({ system: 'phone', value: p.telefono, use: 'mobile' });
    }
    if (p.email) {
      telecom.push({ system: 'email', value: p.email, use: 'home' });
    }

    const addresses: FhirAddress[] = [];
    if (p.domicilio || p.idPais) {
      addresses.push({
        use: 'home',
        line: [p.domicilio || 'Address not registered'],
        country: p.idPais || 'ARG',
      });
    }

    return {
      resourceType: 'Patient',
      id: String(p.idPaciente),
      identifier: [
        {
          system: 'urn:oid:national-id:dni',
          value: p.dni,
          use: 'official',
        },
        ...(p.numeroAfiliado
          ? [
              {
                system: 'urn:oid:healthtech:insurance-id',
                value: p.numeroAfiliado,
                use: 'secondary',
              },
            ]
          : []),
      ],
      active: true,
      name: [
        {
          use: 'official',
          family: p.apellido,
          given: p.nombre.split(' '),
        },
      ],
      telecom,
      gender: fhirGender,
      birthDate: p.fechaNacimiento ? String(p.fechaNacimiento) : undefined,
      address: addresses,
      managingOrganization: {
        display: 'National Medical Center - HealthTech',
      },
    };
  }

  static toBundle(patients: Paciente[], total: number, baseUrl: string): FhirBundle<FhirPatientResource> {
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      entry: patients.map((p) => ({
        fullUrl: `${baseUrl}/api/patients/${p.idPaciente}/fhir`,
        resource: FhirPatientMapper.toFhir(p),
      })),
    };
  }
}
