import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medical-records.component.html',
})
export class MedicalRecordsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthStateService);

  readonly records = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly doctors = signal<any[]>([]);
  readonly isFtsMode = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);

  selectedPatientId: number = 1;
  ftsQuery: string = '';

  drugName = '';
  drugDose = '';
  drugFreq = '';
  drugDays = 30;

  newRecord: any = {
    idPaciente: 1,
    idMedico: 2,
    diagnosticoCodigoCie: 'I10',
    diagnosticoDescripcion: '',
    tratamiento: '',
    signosVitales: {
      presion_arterial: '120/80',
      frecuencia_cardiaca_lpm: 75,
      temperatura_c: 36.6,
      peso_kg: 78.5,
      oxigeno_pct: 99,
    },
    recetaMedicamentos: [],
  };

  constructor() {
    effect(() => {
      // Reacciona al cambio de rol en el switcher superior
      if (this.auth.isBasicUser()) {
        this.selectedPatientId = this.auth.currentUser().patientId || 1;
      }
      this.loadPatientRecords();
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['patientId'] && this.auth.isAdmin()) {
        this.selectedPatientId = parseInt(params['patientId'], 10);
      } else if (this.auth.isBasicUser()) {
        this.selectedPatientId = this.auth.currentUser().patientId || 1;
      }
      this.loadPatientRecords();
    });

    if (this.auth.isAdmin()) {
      this.api.getPatients().subscribe((p) => this.patients.set(p));
    }
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
  }

  loadPatientRecords(): void {
    this.isFtsMode.set(false);
    const targetId = this.auth.isBasicUser()
      ? (this.auth.currentUser().patientId || 1)
      : this.selectedPatientId;

    this.api.getRecordsByPatient(targetId).subscribe({
      next: (data) => this.records.set(data || []),
      error: (err) => console.error('Error al cargar historial médico:', err),
    });
  }

  searchFts(): void {
    const query = this.ftsQuery.trim();
    if (!query) {
      this.loadPatientRecords();
      return;
    }

    if (this.auth.isBasicUser()) {
      // Para paciente, búsqueda estricta únicamente dentro de sus propios antecedentes
      this.isFtsMode.set(true);
      const current = this.records();
      const filtered = current.filter((r) => {
        const text = `${r.diagnosticoDescripcion || r.diagnostico_descripcion || ''} ${r.tratamiento || ''} ${r.diagnosticoCodigoCie || r.diagnostico_codigo_cie || ''}`.toLowerCase();
        return text.includes(query.toLowerCase());
      });
      this.records.set(filtered);
    } else {
      // Para Recepción / Staff médico, búsqueda clínica asistida
      this.isFtsMode.set(true);
      this.api.searchClinicalRecords(query).subscribe({
        next: (data) => this.records.set(data || []),
        error: (err) => console.error(err),
      });
    }
  }

  clearSearch(): void {
    this.ftsQuery = '';
    this.loadPatientRecords();
  }

  openModal(): void {
    if (this.auth.isBasicUser()) return; // Los pacientes no crean notas clínicas
    this.newRecord.idPaciente = this.selectedPatientId;
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitRecord(event: Event): void {
    event.preventDefault();
    if (this.drugName) {
      this.newRecord.recetaMedicamentos = [
        {
          medicamento: this.drugName,
          dosis: this.drugDose,
          frecuencia: this.drugFreq,
          dias: this.drugDays,
        },
      ];
    }

    this.api.createMedicalRecord(this.newRecord).subscribe({
      next: () => {
        this.closeModal();
        this.loadPatientRecords();
      },
      error: (err) => alert(err.error?.message || 'Error al guardar nota médica'),
    });
  }
}
