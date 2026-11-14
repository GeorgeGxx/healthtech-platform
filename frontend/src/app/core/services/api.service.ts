import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ToastService } from './toast.service';

export interface DashboardMetrics {
  kpis: {
    totalPatients: number;
    totalAppointments: number;
    appointmentsAttended: number;
    appointmentsPending: number;
    appointmentsCanceled: number;
    totalBeds: number;
    occupiedBeds: number;
    occupancyRate: number;
    totalRevenue: number;
    totalInsuranceDiscount: number;
    averageTicket: number;
  };
  activeHospitalizations: any[];
  upcomingAppointments: any[];
}

export interface ClinicalServiceTariff {
  id: string;
  categoria: 'consulta' | 'internacion' | 'estudio' | 'cirugia' | 'laboratorio' | 'pediatria' | string;
  categoriaNombre: string;
  nombre: string;
  descripcion: string;
  precioBase: number;
  modalidad: string;
  incluye: string[];
  tiempoEstimado: string;
  coberturaAplica: boolean;
  imagenUrl: string;
}

export interface Medicamento {
  idMedicamento: string;
  nombreComercial: string;
  principioActivo: string;
  categoriaTerapeutica: string;
  presentacion: string;
  lote: string;
  caducidad: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  nivelAlerta: 'Normal' | 'Bajo' | 'Crítico' | string;
  ubicacionAlmacen: string;
  precioUnitarioMxn: number;
  activo: boolean;
}

export interface PharmacySummary {
  totalMedicamentos: number;
  totalUnidadesStock: number;
  criticosCount: number;
  bajoCount: number;
  normalCount: number;
  valorInventarioMxn: number;
  almacenesCount: number;
}

// Clinical fallback data synced with 02_seed_centromedico.sql
const FALLBACK_METRICS: DashboardMetrics = {
  kpis: {
    totalPatients: 12,
    totalAppointments: 15,
    appointmentsAttended: 8,
    appointmentsPending: 5,
    appointmentsCanceled: 2,
    totalBeds: 8,
    occupiedBeds: 3,
    occupancyRate: 38,
    totalRevenue: 28500,
    totalInsuranceDiscount: 42000,
    averageTicket: 2850,
  },
  activeHospitalizations: [
    {
      id_internacion: 1,
      paciente: 'Carlos Mendoza',
      dni: '28456123',
      habitacion: 'Room 101-A (Floor 1)',
      tipo_habitacion: 'individual',
      fecha_ingreso: '2026-03-01T08:30:00Z',
      diagnostico_ingreso: 'Acute coronary syndrome under hemodynamic observation',
    },
    {
      id_internacion: 2,
      paciente: 'Mariana Gomez',
      dni: '32198745',
      habitacion: 'Room 201-B (Floor 2)',
      tipo_habitacion: 'shared',
      fecha_ingreso: '2026-03-02T14:15:00Z',
      diagnostico_ingreso: 'Immediate postoperative laparoscopic appendectomy',
    },
    {
      id_internacion: 3,
      paciente: 'Roberto Castro',
      dni: '25632147',
      habitacion: 'Room 301-A (Floor 3)',
      tipo_habitacion: 'individual',
      fecha_ingreso: '2026-03-03T11:00:00Z',
      diagnostico_ingreso: 'Community-acquired pneumonia with O2 therapy',
    },
  ],
  upcomingAppointments: [
    {
      id_turno: 101,
      fecha_hora: new Date(Date.now() + 3600000).toISOString(),
      paciente: 'Lucia Fernandez',
      medico: 'Dr. Gomez',
      especialidad: 'Dermatology',
      estado: 'confirmado',
      motivo_consulta: 'Review and dermoscopy of atypical skin lesion',
    },
    {
      id_turno: 102,
      fecha_hora: new Date(Date.now() + 7200000).toISOString(),
      paciente: 'Ana Torres',
      medico: 'Dr. Arevalo',
      especialidad: 'Orthopedics',
      estado: 'pendiente',
      motivo_consulta: 'Post-immobilization joint radiological follow-up',
    },
    {
      id_turno: 103,
      fecha_hora: new Date(Date.now() + 10800000).toISOString(),
      paciente: 'Sofia Herrera',
      medico: 'Dr. Castelo',
      especialidad: 'General Medicine',
      estado: 'confirmado',
      motivo_consulta: 'Annual preventive exam and risk factor control',
    },
    {
      id_turno: 104,
      fecha_hora: new Date(Date.now() + 14400000).toISOString(),
      paciente: 'Javier Morales',
      medico: 'Dr. Castelo',
      especialidad: 'Cardiology',
      estado: 'pendiente',
      motivo_consulta: 'Comprehensive preoperative cardiology evaluation',
    },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  // Dynamic base URL (supports local development or Nginx reverse proxy at /api)
  private readonly baseUrl =
    typeof window !== 'undefined' && window.location.port === '4200'
      ? 'http://localhost:8000/api'
      : '/api';

  // Global signals
  readonly isConnected = signal<boolean>(true);
  readonly activeSection = signal<string>('dashboard');

  private handleOperationalError(context: string) {
    return (err: any) => {
      this.isConnected.set(false);
      this.toast.error(
        err?.error?.message || `Could not query ${context}. Please check connection or permissions.`,
        'Service Error',
      );
      return throwError(() => err);
    };
  }

  // --- Dashboard ---
  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.baseUrl}/dashboard/metrics`).pipe(
      tap(() => this.isConnected.set(true)),
      catchError(this.handleOperationalError('dashboard metrics')),
    );
  }

  // --- Patients ---
  getPatients(search?: string, page?: number, limit?: number): Observable<any> {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (page) params['page'] = page.toString();
    if (limit) params['limit'] = limit.toString();
    return this.http.get<any>(`${this.baseUrl}/patients`, { params }).pipe(
      tap(() => this.isConnected.set(true)),
      catchError(this.handleOperationalError('the patient registry')),
    );
  }

  getPatientById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/patients/${id}`);
  }

  createPatient(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/patients`, data);
  }

  updatePatient(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/patients/${id}`, data);
  }

  patchPatient(id: number, data: any): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/patients/${id}`, data);
  }

  deletePatient(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/patients/${id}`);
  }

  getInsurances(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/patients/catalogs/insurances`).pipe(
      catchError(() => of([
        { idObraSocial: 1, nombre: 'GNP Insurance', codigoSeguro: 'GNP-MED', porcentajeCobertura: 80 },
        { idObraSocial: 2, nombre: 'MetLife', codigoSeguro: 'METLIFE-PLUS', porcentajeCobertura: 75 },
        { idObraSocial: 3, nombre: 'AXA Health', codigoSeguro: 'AXA-SALUD', porcentajeCobertura: 70 },
        { idObraSocial: 4, nombre: 'Monterrey NYL Insurance', codigoSeguro: 'SMNYL-VIP', porcentajeCobertura: 85 },
        { idObraSocial: 5, nombre: 'Self-Pay / Uninsured', codigoSeguro: 'PARTIC', porcentajeCobertura: 0 }
      ]))
    );
  }

  getCountries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/patients/catalogs/countries`).pipe(
      catchError(() => of([
        { idPais: 'MEX', nombre: 'Mexico', nacionalidad: 'Mexican' },
        { idPais: 'ARG', nombre: 'Argentina', nacionalidad: 'Argentine' },
        { idPais: 'COL', nombre: 'Colombia', nacionalidad: 'Colombian' },
        { idPais: 'ESP', nombre: 'Spain', nacionalidad: 'Spanish' }
      ]))
    );
  }

  // --- Appointments & Schedule ---
  getAppointments(doctorId?: number, date?: string, page?: number, limit?: number): Observable<any> {
    const params: Record<string, string> = {};
    if (doctorId) params['doctorId'] = doctorId.toString();
    if (date) params['date'] = date;
    if (page) params['page'] = page.toString();
    if (limit) params['limit'] = limit.toString();
    return this.http.get<any>(`${this.baseUrl}/appointments`, { params }).pipe(
      tap(() => this.isConnected.set(true)),
      catchError(this.handleOperationalError('the appointment schedule')),
    );
  }


  createAppointment(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/appointments`, data);
  }

  updateAppointmentStatus(id: number, estado: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/appointments/${id}/status`, { estado });
  }

  updateAppointment(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/appointments/${id}`, data);
  }

  deleteAppointment(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/appointments/${id}`);
  }

  // --- Physicians & Staff ---
  getDoctors(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors`).pipe(
      catchError(() => of([
        { idMedico: 1, nombre: 'Rafael', apellido: 'Castelo', matricula: 'MN-10001', especialidad: 'Medical Direction' },
        { idMedico: 2, nombre: 'Laura', apellido: 'Gomez', matricula: 'MN-10002', especialidad: 'Dermatology' },
        { idMedico: 3, nombre: 'Alberto', apellido: 'Arevalo', matricula: 'MN-10003', especialidad: 'Orthopedics' }
      ]))
    );
  }

  getSpecialties(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors/specialties`).pipe(
      catchError(() => of([
        { idEspecialidad: 1, nombre: 'General Medicine', precioConsultaBase: 950 },
        { idEspecialidad: 2, nombre: 'Cardiology', precioConsultaBase: 1600 },
        { idEspecialidad: 3, nombre: 'Orthopedics', precioConsultaBase: 1400 },
        { idEspecialidad: 4, nombre: 'Dermatology', precioConsultaBase: 1300 },
        { idEspecialidad: 5, nombre: 'Pediatrics', precioConsultaBase: 1100 },
        { idEspecialidad: 6, nombre: 'Neurology', precioConsultaBase: 1800 },
        { idEspecialidad: 7, nombre: 'Gastroenterology', precioConsultaBase: 1500 }
      ]))
    );
  }

  getHospitalTariffs(): Observable<ClinicalServiceTariff[]> {
    return this.http.get<ClinicalServiceTariff[]>(`${this.baseUrl}/billing/tariffs`).pipe(
      catchError(() => of([
      {
        id: 'srv-cg-01',
        categoria: 'consulta',
        categoriaNombre: 'Medical Consultation',
        nombre: 'General Medicine Consultation',
        descripcion: 'Preventive primary medical care, general clinical checkup, and comprehensive diagnosis.',
        precioBase: 950,
        modalidad: 'In-person outpatient consultation',
        incluye: ['Anthropometric assessment', 'Complete clinical review', 'Prescriptions and medical orders'],
        tiempoEstimado: '30 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/consultation.jpg',
      },
      {
        id: 'srv-card-02',
        categoria: 'consulta',
        categoriaNombre: 'Medical Consultation',
        nombre: 'Cardiology Specialist Consultation',
        descripcion: 'Comprehensive cardiovascular evaluation, ischemic risk prevention, and therapeutic adjustment.',
        precioBase: 1600,
        modalidad: 'Outpatient specialist consultation',
        incluye: ['Auscultation and hemodynamic assessment', 'Review of prior studies', 'Cardiac follow-up plan'],
        tiempoEstimado: '30 - 45 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/cardiology.jpg',
      },
      {
        id: 'srv-trauma-03',
        categoria: 'consulta',
        categoriaNombre: 'Medical Consultation',
        nombre: 'Orthopedics & Traumatology Consultation',
        descripcion: 'Diagnosis and treatment of the musculoskeletal system, joints, and sports injuries.',
        precioBase: 1400,
        modalidad: 'Outpatient specialist consultation',
        incluye: ['Orthopedic assessment maneuvers', 'Immobilization or physical therapy indication', 'Imaging review'],
        tiempoEstimado: '30 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/consultation.jpg',
      },
      {
        id: 'srv-pedia-04',
        categoria: 'consulta',
        categoriaNombre: 'Medical Consultation',
        nombre: 'Pediatrics & Well-Child Checkup',
        descripcion: 'Psychomotor development monitoring, vaccination schedule, and nutrition for children and adolescents.',
        precioBase: 1100,
        modalidad: 'Outpatient pediatric consultation',
        incluye: ['Growth check (height & weight)', 'Vaccination record review', 'Guidance for guardians'],
        tiempoEstimado: '30 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/pediatrics.jpg',
      },
      {
        id: 'srv-derm-05',
        categoria: 'consulta',
        categoriaNombre: 'Medical Consultation',
        nombre: 'Clinical Dermatology Consultation',
        descripcion: 'Dermoscopic evaluation of skin lesions, moles, dermatitis, and skin conditions.',
        precioBase: 1300,
        modalidad: 'Outpatient specialist consultation',
        incluye: ['Digital dermoscopy', 'Topical/systemic treatment plan', 'Skincare routine guidance'],
        tiempoEstimado: '30 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/consultation.jpg',
      },
      {
        id: 'srv-neuro-06',
        categoria: 'consulta',
        categoriaNombre: 'Medical Consultation',
        nombre: 'Clinical Neurology Consultation',
        descripcion: 'Evaluation of the central and peripheral nervous system, headaches, neuropathies, and motor disorders.',
        precioBase: 1800,
        modalidad: 'High-specialty consultation',
        incluye: ['Complete cranial nerve neurological exam', 'Reflex and gait evaluation', 'Specialized prescription'],
        tiempoEstimado: '45 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/consultation.jpg',
      },
      {
        id: 'srv-hab-gen',
        categoria: 'internacion',
        categoriaNombre: 'Hospitalization',
        nombre: 'General Bed in Shared Room',
        descripcion: 'Care floor accommodation with medical supervision and continuous nursing care.',
        precioBase: 3800,
        modalidad: 'Per day of hospital stay',
        incluye: ['Electric articulated hospital bed', 'Continuous nursing care', 'Clinical nutrition service', 'Vital signs monitoring'],
        tiempoEstimado: '24 hours',
        coberturaAplica: true,
        imagenUrl: '/images/services/hospital_room.jpg',
      },
      {
        id: 'srv-hab-ind',
        categoria: 'internacion',
        categoriaNombre: 'Hospitalization',
        nombre: 'Private Recovery Room',
        descripcion: 'Private suite with companion bed, private bathroom, and maximum comfort.',
        precioBase: 6500,
        modalidad: 'Per day of hospital stay',
        incluye: ['Full privacy and individual suite', 'Direct nursing care', 'Extended visiting hours', 'Multiparameter monitoring'],
        tiempoEstimado: '24 hours',
        coberturaAplica: true,
        imagenUrl: '/images/services/hospital_room.jpg',
      },
      {
        id: 'srv-hab-uti',
        categoria: 'internacion',
        categoriaNombre: 'Hospitalization',
        nombre: 'Intensive Care Unit (ICU)',
        descripcion: 'High-complexity critical care with advanced life support, ventilator, and permanent medical surveillance.',
        precioBase: 18500,
        modalidad: 'Per day in intensive care',
        incluye: ['24/7 invasive hemodynamic monitoring', 'Dedicated intensivist physician on duty', '1-to-1 ICU nursing', 'Medical gases and life support'],
        tiempoEstimado: '24 hours',
        coberturaAplica: true,
        imagenUrl: '/images/services/hospital_room.jpg',
      },
      {
        id: 'srv-est-ecg',
        categoria: 'estudio',
        categoriaNombre: 'Diagnostic Study',
        nombre: '12-Lead Electrocardiogram (ECG)',
        descripcion: 'Recording of cardiac electrical activity with immediate cardiology report and interpretation.',
        precioBase: 850,
        modalidad: 'Non-invasive outpatient study',
        incluye: ['Millimeter-paper ECG tracing', 'Report signed by cardiologist', 'Digital delivery to record'],
        tiempoEstimado: '15 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/cardiology.jpg',
      },
      {
        id: 'srv-est-eco',
        categoria: 'estudio',
        categoriaNombre: 'Diagnostic Study',
        nombre: 'Diagnostic Doppler Ultrasound',
        descripcion: 'Real-time diagnostic ultrasound to assess vascular flow and organ morphology.',
        precioBase: 1950,
        modalidad: 'Diagnostic imaging suite',
        incluye: ['High-resolution transducer ultrasound scan', 'Video and image recording', 'Specialized radiology report'],
        tiempoEstimado: '30 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/cardiology.jpg',
      },
      {
        id: 'srv-est-lab',
        categoria: 'estudio',
        categoriaNombre: 'Diagnostic Study',
        nombre: 'Biochemical Profile & Clinical Lab',
        descripcion: 'Complete blood panel: CBC, blood glucose, renal function (creatinine/urea), and lipid profile.',
        precioBase: 1200,
        modalidad: 'Lab sample collection',
        incluye: ['Sample draw with disposable sterile kit', 'Automated processing', 'Results available in 24 hrs on portal'],
        tiempoEstimado: '10 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/laboratory.jpg',
      },
      {
        id: 'srv-cx-menor',
        categoria: 'cirugia',
        categoriaNombre: 'Surgical Procedure',
        nombre: 'Minor Outpatient Surgical Procedure',
        descripcion: 'Procedures under local anesthesia in outpatient OR: cyst excision, biopsies, and drainages.',
        precioBase: 4800,
        modalidad: 'Outpatient operating room',
        incluye: ['Operating room fees', 'Local anesthesia and sterile drapes', 'Dressing and suture supplies', 'Pathology report'],
        tiempoEstimado: '45 - 60 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/surgery.jpg',
      },
      {
        id: 'srv-cx-sutura',
        categoria: 'cirugia',
        categoriaNombre: 'Surgical Procedure',
        nombre: 'Complex Wound Care & Suture Removal',
        descripcion: 'Advanced surgical wound care, deep asepsis, and debridement by specialized nursing staff.',
        precioBase: 900,
        modalidad: 'Wound care suite',
        incluye: ['Antiseptic supplies and specialty dressings', 'Local pain management', 'Home care instructions'],
        tiempoEstimado: '20 min',
        coberturaAplica: true,
        imagenUrl: '/images/services/surgery.jpg',
      }
    ]))
  );
}


  getOffices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors/offices`).pipe(
      catchError(() => of([
        { idConsultorio: 1, codigo: 'C-101', piso: 1, descripcion: 'General Medicine Office' },
        { idConsultorio: 2, codigo: 'C-201', piso: 2, descripcion: 'Cardiology Unit' },
        { idConsultorio: 3, codigo: 'C-302', piso: 3, descripcion: 'Dermatology Suite' }
      ]))
    );
  }

  getDoctorHierarchy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors/hierarchy-tree`);
  }

  // --- Hospitalizations & Beds ---
  getBedCensus(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/hospitalizations/bed-census`).pipe(
      tap(() => this.isConnected.set(true)),
      catchError(this.handleOperationalError('the bed census')),
    );
  }

  getHospitalizations(activeOnly: boolean = false): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/hospitalizations`, {
      params: { activeOnly: activeOnly.toString() },
    });
  }

  admitPatient(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/hospitalizations/admit`, data);
  }

  dischargePatient(id: number, motivoAlta: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/hospitalizations/${id}/discharge`, { motivoAlta });
  }

  // --- Medical Records (EHR / FTS) ---
  getRecordsByPatient(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/medical-records/patient/${patientId}`);
  }

  searchClinicalRecords(q: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/medical-records/search`, {
      params: { q },
    });
  }

  createMedicalRecord(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/medical-records`, data);
  }

  updateMedicalRecord(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/medical-records/${id}`, data);
  }

  getRecordsByDoctor(doctorId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/medical-records/doctor/${doctorId}`).pipe(
      tap(() => this.isConnected.set(true)),
      catchError(this.handleOperationalError('the physician clinical progress notes')),
    );
  }

  // --- Billing ---
  getBillingSummary(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/billing/summary`).pipe(
      tap(() => this.isConnected.set(true)),
      catchError(this.handleOperationalError('the billing summary')),
    );
  }

  getPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/billing`);
  }

  getBillingConcepts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/billing/concepts`);
  }

  createPayment(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/billing`, data);
  }

  // --- Pharmacy & Hospital Inventory ---
  getMedicamentos(search?: string, categoria?: string, alerta?: string): Observable<Medicamento[]> {
    const params: Record<string, string> = {};
    if (search && search.trim() !== '') params['search'] = search.trim();
    if (categoria && categoria.trim() !== '') params['categoria'] = categoria.trim();
    if (alerta && alerta.trim() !== '') params['alerta'] = alerta.trim();

    return this.http.get<Medicamento[]>(`${this.baseUrl}/pharmacy`, { params }).pipe(
      catchError((err) => {
        console.warn('API /pharmacy unavailable:', err.message);
        return of([]);
      })
    );
  }

  getPharmacySummary(): Observable<PharmacySummary> {
    return this.http.get<PharmacySummary>(`${this.baseUrl}/pharmacy/summary`).pipe(
      catchError((err) => {
        console.warn('API /pharmacy/summary unavailable:', err.message);
        return of({
          totalMedicamentos: 20,
          totalUnidadesStock: 6379,
          criticosCount: 4,
          bajoCount: 4,
          normalCount: 12,
          valorInventarioMxn: 902950,
          almacenesCount: 5,
        });
      })
    );
  }

  // --- Orchestrated Sagas & Outbox CDC ---
  executeBookingSaga(data: {
    idPaciente: number;
    idMedico: number;
    idEspecialidad: number;
    inicio: string;
    fin: string;
    motivoConsulta?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/appointments/saga-booking`, data);
  }

  getSagas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/admin/sagas`).pipe(
      catchError(() => of([])),
    );
  }

  getSagaById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/sagas/${id}`);
  }

  getOutboxStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/outbox/stats`).pipe(
      catchError(() => of({ total: 0, pendientes: 0, publicados: 0, fallidos: 0 })),
    );
  }

  retryFailedOutbox(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/outbox/retry-failed`, {});
  }

  relayOutboxNow(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/outbox/relay-now`, {});
  }

  // --- Pharmacy: Dispensing & Stock Adjustment ---
  dispenseMedication(id: string, cantidad: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/pharmacy/${id}/dispense`, { cantidad });
  }

  adjustMedicationStock(id: string, nuevoStock: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/pharmacy/${id}/stock`, { nuevoStock });
  }

  // --- Notifications: Dead-Letter Queue (DLQ) ---
  getNotificationsDlq(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/notifications/dlq`).pipe(
      catchError(() => of({ totalEnDlq: 0, items: [] })),
    );
  }

  retryDlqNotification(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/notifications/dlq/${id}/retry`, {});
  }

  // --- WebRTC Telemedicine (Pillar 4) ---
  createVirtualRoom(appointmentId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/appointments/${appointmentId}/virtual-room`, {});
  }

  getVirtualRoom(roomId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/appointments/virtual-room/${roomId}`);
  }

  // --- Digital Medical Prescription & HMAC-SHA256 Cryptography (Pillar 2) ---
  createDigitalPrescription(data: {
    idPaciente: number;
    idMedico: number;
    diagnostico: string;
    medicamentos: Array<{ nombre: string; dosis: string; frecuencia: string; duracionDias: number }>;
    vigenciaDias?: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/medical-records/prescriptions`, data);
  }

  verifyDigitalPrescription(code: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/medical-records/prescriptions/${code}/verify`);
  }

  // --- HL7 FHIR R4 Medical Interoperability (Pillar 2) ---
  getPatientFhir(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/patients/${id}/fhir`);
  }

  getPatientsFhirBundle(search?: string, page?: number, limit?: number): Observable<any> {
    let url = `${this.baseUrl}/patients/fhir?page=${page || 1}&limit=${limit || 20}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.http.get<any>(url);
  }

  getEncounterFhir(recordId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/medical-records/${recordId}/fhir`);
  }

  // --- Finance: 80/20 Medical Fee Settlement (Pillar 4) ---
  getDoctorSettlement(doctorId: number, periodo?: string): Observable<any> {
    let url = `${this.baseUrl}/billing/doctors/${doctorId}/settlement`;
    if (periodo) url += `?periodo=${periodo}`;
    return this.http.get<any>(url);
  }

  // --- Multichannel Notifications WhatsApp / Email (Pillar 4) ---
  triggerMultichannelReminder(data: {
    idTurno: number;
    pacienteNombre: string;
    medicoNombre: string;
    especialidad: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/notifications/reminders/trigger`, data);
  }
}
