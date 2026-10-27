import { HistoriaClinica } from '../entities/historia-clinica.entity.js';

export interface FhirCoding {
  system: string;
  code: string;
  display: string;
}

export interface FhirEncounterResource {
  resourceType: 'Encounter';
  id: string;
  status: 'finished' | 'in-progress' | 'cancelled';
  class: {
    system: string;
    code: string;
    display: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  participant: Array<{
    individual: {
      reference: string;
      display?: string;
    };
  }>;
  period: {
    start: string;
  };
  reasonCode?: Array<{
    text: string;
  }>;
  diagnosis?: Array<{
    condition: {
      display: string;
    };
    use: {
      coding: FhirCoding[];
    };
  }>;
  serviceProvider?: {
    display: string;
  };
}

export class FhirEncounterMapper {
  static toFhir(record: HistoriaClinica): FhirEncounterResource {
    const patientName = record.paciente
      ? `${record.paciente.nombre} ${record.paciente.apellido}`
      : `Paciente #${record.idPaciente}`;

    const doctorName = record.medico
      ? `Dr(a). ${record.medico.nombre} ${record.medico.apellido} (Mat: ${record.medico.matricula})`
      : `Médico #${record.idMedico}`;

    return {
      resourceType: 'Encounter',
      id: String(record.idHistoria),
      status: 'finished',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'Ambulatory / Consulta Externa',
      },
      subject: {
        reference: `Patient/${record.idPaciente}`,
        display: patientName,
      },
      participant: [
        {
          individual: {
            reference: `Practitioner/${record.idMedico}`,
            display: doctorName,
          },
        },
      ],
      period: {
        start: record.fechaAtencion ? new Date(record.fechaAtencion).toISOString() : new Date().toISOString(),
      },
      reasonCode: [
        {
          text: record.diagnosticoDescripcion || 'Consulta médica general',
        },
      ],
      diagnosis: [
        {
          condition: {
            display: record.diagnosticoDescripcion,
          },
          use: {
            coding: [
              {
                system: 'http://hl7.org/fhir/sid/icd-10',
                code: record.diagnosticoCodigoCie || 'CIE-10',
                display: 'Diagnóstico Principal de Consulta',
              },
            ],
          },
        },
      ],
      serviceProvider: {
        display: 'Centro Médico Nacional - HealthTech Platform',
      },
    };
  }
}
