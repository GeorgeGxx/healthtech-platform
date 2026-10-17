import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  // URL base dinámica (soporta desarrollo local en puerto 3000 o Reverse Proxy Nginx en /api)
  private readonly baseUrl =
    window.location.port === '4200'
      ? 'http://localhost:3000/api'
      : '/api';

  // Signals globales
  readonly isConnected = signal<boolean>(true);
  readonly activeSection = signal<string>('dashboard');

  // --- Dashboard ---
  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.baseUrl}/dashboard/metrics`);
  }

  // --- Pacientes ---
  getPatients(search?: string): Observable<any[]> {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    return this.http.get<any[]>(`${this.baseUrl}/patients`, { params });
  }

  getPatientById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/patients/${id}`);
  }

  createPatient(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/patients`, data);
  }

  getInsurances(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/patients/insurances`);
  }

  getCountries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/patients/countries`);
  }

  // --- Turnos y Agenda ---
  getAppointments(doctorId?: number, date?: string): Observable<any[]> {
    const params: Record<string, string> = {};
    if (doctorId) params['doctorId'] = doctorId.toString();
    if (date) params['date'] = date;
    return this.http.get<any[]>(`${this.baseUrl}/appointments`, { params });
  }

  createAppointment(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/appointments`, data);
  }

  updateAppointmentStatus(id: number, estado: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/appointments/${id}/status`, { estado });
  }

  // --- Médicos y Staff ---
  getDoctors(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors`);
  }

  getSpecialties(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors/specialties`);
  }

  getOffices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors/offices`);
  }

  getDoctorHierarchy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/doctors/hierarchy-tree`);
  }

  // --- Internaciones y Camas ---
  getBedCensus(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/hospitalizations/bed-census`);
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
    return this.http.get<any[]>(`${this.baseUrl}/billing/summary`);
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
