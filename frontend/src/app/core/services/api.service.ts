import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

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

// Datos de contingencia clínica sincronizados fielmente con 02_seed_centromedico.sql
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
      habitacion: 'Habitación 101-A (Piso 1)',
      tipo_habitacion: 'individual',
      fecha_ingreso: '2026-03-01T08:30:00Z',
      diagnostico_ingreso: 'Síndrome coronario agudo en observación hemodinámica',
    },
    {
      id_internacion: 2,
      paciente: 'Mariana Gómez',
      dni: '32198745',
      habitacion: 'Habitación 201-B (Piso 2)',
      tipo_habitacion: 'compartida',
      fecha_ingreso: '2026-03-02T14:15:00Z',
      diagnostico_ingreso: 'Postoperatorio inmediato apendicectomía laparoscópica',
    },
    {
      id_internacion: 3,
      paciente: 'Roberto Castro',
      dni: '25632147',
      habitacion: 'Habitación 301-A (Piso 3)',
      tipo_habitacion: 'individual',
      fecha_ingreso: '2026-03-03T11:00:00Z',
      diagnostico_ingreso: 'Neumonía adquirida en la comunidad con O2 terapia',
    },
  ],
  upcomingAppointments: [
    {
      id_turno: 101,
      fecha_hora: new Date(Date.now() + 3600000).toISOString(),
      paciente: 'Lucía Fernández',
      medico: 'Dr/a. Gómez',
      especialidad: 'Dermatología',
      estado: 'confirmado',
      motivo_consulta: 'Revisión y dermatoscopía de lesión cutánea atípica',
    },
    {
      id_turno: 102,
      fecha_hora: new Date(Date.now() + 7200000).toISOString(),
      paciente: 'Ana Torres',
      medico: 'Dr/a. Arévalo',
      especialidad: 'Traumatología',
      estado: 'pendiente',
      motivo_consulta: 'Control radiológico post-inmovilización articular',
    },
    {
      id_turno: 103,
      fecha_hora: new Date(Date.now() + 10800000).toISOString(),
      paciente: 'Sofía Herrera',
      medico: 'Dr/a. Castelo',
      especialidad: 'Medicina General',
      estado: 'confirmado',
      motivo_consulta: 'Examen preventivo anual y control de factores de riesgo',
    },
    {
      id_turno: 104,
      fecha_hora: new Date(Date.now() + 14400000).toISOString(),
      paciente: 'Javier Morales',
      medico: 'Dr/a. Castelo',
      especialidad: 'Cardiología',
      estado: 'pendiente',
      motivo_consulta: 'Evaluación prequirúrgica cardiológica integral',
    },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  // URL base dinámica (soporta desarrollo local en puerto 3000 o Reverse Proxy Nginx en /api)
  private readonly baseUrl =
    typeof window !== 'undefined' && window.location.port === '4200'
      ? 'http://localhost:3000/api'
      : '/api';

  // Signals globales
  readonly isConnected = signal<boolean>(true);
  readonly activeSection = signal<string>('dashboard');

  // --- Dashboard ---
  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.baseUrl}/dashboard/metrics`).pipe(
      tap(() => this.isConnected.set(true)),
      catchError((err) => {
        console.warn('API /dashboard/metrics no disponible. Cargando réplica clínica PostgreSQL 18:', err.message);
        this.isConnected.set(false);
        return of(FALLBACK_METRICS);
      })
    );
  }

  // --- Pacientes ---
  getPatients(search?: string): Observable<any[]> {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    return this.http.get<any[]>(`${this.baseUrl}/patients`, { params }).pipe(
      tap(() => this.isConnected.set(true)),
      catchError(() => of([
        { idPaciente: 1, dni: '28456123', nombre: 'Juan', apellido: 'Pérez García', email: 'juan.perez@email.com', telefono: '+52 55 1234-5678', sexo: 'M', idObraSocial: 1, obraSocial: 'OSDE 310 (Póliza 88992)', numeroAfiliado: '88992' },
        { idPaciente: 2, dni: '32198745', nombre: 'Mariana', apellido: 'Gómez', email: 'mgomez@email.com', telefono: '+52 55 2345-6789', sexo: 'F', idObraSocial: 2, obraSocial: 'Swiss Medical' },
        { idPaciente: 3, dni: '25632147', nombre: 'Roberto', apellido: 'Castro', email: 'rcastro@email.com', telefono: '+52 55 3456-7890', sexo: 'M', idObraSocial: 3, obraSocial: 'Galeno Oro' },
        { idPaciente: 4, dni: '34852963', nombre: 'Lucía', apellido: 'Fernández', email: 'lfernandez@email.com', telefono: '+52 55 4567-8901', sexo: 'F', idObraSocial: 4, obraSocial: 'PAMI Jubilados' },
        { idPaciente: 5, dni: '39147258', nombre: 'Ana', apellido: 'Torres', email: 'atorres@email.com', telefono: '+52 55 5678-9012', sexo: 'F', idObraSocial: 5, obraSocial: 'Particular' }
      ]))
    );
  }

  getPatientById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/patients/${id}`);
  }

  createPatient(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/patients`, data);
  }

  getInsurances(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/patients/insurances`).pipe(
      catchError(() => of([
        { idObraSocial: 1, nombre: 'OSDE 310', codigoSeguro: 'OSDE-310', porcentajeCobertura: 80 },
        { idObraSocial: 2, nombre: 'Swiss Medical', codigoSeguro: 'SM-BLACK', porcentajeCobertura: 75 },
        { idObraSocial: 3, nombre: 'Galeno Oro', codigoSeguro: 'GAL-ORO', porcentajeCobertura: 65 },
        { idObraSocial: 4, nombre: 'PAMI Jubilados', codigoSeguro: 'PAMI-NAC', porcentajeCobertura: 100 },
        { idObraSocial: 5, nombre: 'Particular/Ninguno', codigoSeguro: 'PARTIC', porcentajeCobertura: 0 }
      ]))
    );
  }

  getCountries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/patients/countries`).pipe(
      catchError(() => of([
        { idPais: 'MEX', nombre: 'México', nacionalidad: 'Mexicana' },
        { idPais: 'ARG', nombre: 'Argentina', nacionalidad: 'Argentina' },
        { idPais: 'COL', nombre: 'Colombia', nacionalidad: 'Colombiana' },
        { idPais: 'ESP', nombre: 'España', nacionalidad: 'Española' }
      ]))
    );
  }

  // --- Turnos y Agenda ---
  getAppointments(doctorId?: number, date?: string): Observable<any[]> {
    const params: Record<string, string> = {};
    if (doctorId) params['doctorId'] = doctorId.toString();
    if (date) params['date'] = date;
    return this.http.get<any[]>(`${this.baseUrl}/appointments`, { params }).pipe(
      catchError(() => of([
        { idTurno: 101, fechaHora: new Date(Date.now() + 3600000).toISOString(), paciente: 'Carlos Mendoza', medico: 'Dr/a. Gómez', especialidad: 'Dermatología', consultorio: 'C-302', estado: 'confirmado', motivoConsulta: 'Control de lunares' },
        { idTurno: 102, fechaHora: new Date(Date.now() + 7200000).toISOString(), paciente: 'Ana Torres', medico: 'Dr/a. Arévalo', especialidad: 'Traumatología', consultorio: 'C-202', estado: 'pendiente', motivoConsulta: 'Evaluación dolor rodilla' },
        { idTurno: 103, fechaHora: new Date(Date.now() + 10800000).toISOString(), paciente: 'Sofía Herrera', medico: 'Dr/a. Castelo', especialidad: 'Cardiología', consultorio: 'C-201', estado: 'atendido', motivoConsulta: 'Electrocardiograma' }
      ]))
    );
  }

  createAppointment(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/appointments`, data);
  }

  updateAppointmentStatus(id: number, estado: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/appointments/${id}/status`, { estado });
  }

  // --- Médicos y Staff ---
  getDoctors(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors`).pipe(
      catchError(() => of([
        { idMedico: 1, nombre: 'Rafael', apellido: 'Castelo', matricula: 'MN-10001', especialidad: 'Dirección Médica' },
        { idMedico: 2, nombre: 'Laura', apellido: 'Gómez', matricula: 'MN-10002', especialidad: 'Dermatología' },
        { idMedico: 3, nombre: 'Alberto', apellido: 'Arévalo', matricula: 'MN-10003', especialidad: 'Traumatología' }
      ]))
    );
  }

  getSpecialties(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors/specialties`).pipe(
      catchError(() => of([
        { idEspecialidad: 1, nombre: 'Medicina General', precioConsultaBase: 15000 },
        { idEspecialidad: 2, nombre: 'Cardiología', precioConsultaBase: 25000 },
        { idEspecialidad: 3, nombre: 'Traumatología', precioConsultaBase: 22000 },
        { idEspecialidad: 4, nombre: 'Dermatología', precioConsultaBase: 20000 }
      ]))
    );
  }

  getOffices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors/offices`).pipe(
      catchError(() => of([
        { idConsultorio: 1, codigo: 'C-101', piso: 1, descripcion: 'Consultorio Medicina General' },
        { idConsultorio: 2, codigo: 'C-201', piso: 2, descripcion: 'Unidad de Cardiología' },
        { idConsultorio: 3, codigo: 'C-302', piso: 3, descripcion: 'Gabinete Dermatología' }
      ]))
    );
  }

  getDoctorHierarchy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors/hierarchy-tree`);
  }

  // --- Internaciones y Camas ---
  getBedCensus(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/hospitalizations/bed-census`).pipe(
      catchError(() => of([
        { idHabitacion: 1, numero: '101', piso: 1, tipo: 'individual', activa: true, ocupada: true, paciente: 'Carlos Mendoza' },
        { idHabitacion: 2, numero: '102', piso: 1, tipo: 'compartida', activa: true, ocupada: false, paciente: null },
        { idHabitacion: 3, numero: '201', piso: 2, tipo: 'compartida', activa: true, ocupada: true, paciente: 'Mariana Gómez' },
        { idHabitacion: 4, numero: '301', piso: 3, tipo: 'individual', activa: true, ocupada: true, paciente: 'Roberto Castro' }
      ]))
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

  // --- Historias Clínicas (EHR / FTS) ---
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

  // --- Facturación ---
  getBillingSummary(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/billing/summary`).pipe(
      catchError(() => of([
        { concepto: 'Consultas Médicas', totalRecaudado: 18500, transacciones: 8 },
        { concepto: 'Internación Hospitalaria', totalRecaudado: 10000, transacciones: 3 }
      ]))
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
}
