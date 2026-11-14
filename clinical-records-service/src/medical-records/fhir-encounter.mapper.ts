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
      : `Patient #${record.idPaciente}`;

    const doctorName = record.medico
      ? `Dr. ${record.medico.nombre} ${record.medico.apellido} (License: ${record.medico.matricula})`
      : `Physician #${record.idMedico}`;

    return {
      resourceType: 'Encounter',
      id: String(record.idHistoria),
      status: 'finished',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'Ambulatory / Outpatient Consultation',
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
          text: record.diagnosticoDescripcion || 'General medical consultation',
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
                code: record.diagnosticoCodigoCie || 'ICD-10',
                display: 'Primary Consultation Diagnosis',
              },
            ],
          },
        },
      ],
      serviceProvider: {
        display: 'National Medical Center - HealthTech Platform',
      },
    };
  }
}
