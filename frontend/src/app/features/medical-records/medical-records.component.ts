import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medical-records.component.html',
})
export class MedicalRecordsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly records = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly doctors = signal<any[]>([]);
  readonly isFtsMode = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);

  selectedPatientId: number = 4;
  ftsQuery: string = '';

  drugName = '';
  drugDose = '';
  drugFreq = '';
  drugDays = 30;

  newRecord: any = {
    idPaciente: 4,
    idMedico: 2,
    diagnosticoCodigoCie: 'I10',
    diagnosticoDescripcion: '',
    tratamiento: '',
    signosVitales: {
      presion_arterial: '120/80',
      frecuencia_cardiaca_lpm: 75,
      temperatura_c: 36.6,
      peso_kg: 80,
      oxigeno_pct: 99,
    },
    recetaMedicamentos: [],
  };

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['patientId']) {
        this.selectedPatientId = parseInt(params['patientId'], 10);
      }
      this.loadPatientRecords();
    });

    this.api.getPatients().subscribe((p) => this.patients.set(p));
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
  }

  loadPatientRecords(): void {
    this.isFtsMode.set(false);
    this.api.getRecordsByPatient(this.selectedPatientId).subscribe({
      next: (data) => this.records.set(data),
      error: (err) => console.error(err),
    });
  }

  searchFts(): void {
    if (!this.ftsQuery.trim()) {
      this.loadPatientRecords();
      return;
    }
    this.isFtsMode.set(true);
    this.api.searchClinicalRecords(this.ftsQuery).subscribe({
      next: (data) => this.records.set(data),
      error: (err) => console.error(err),
    });
  }

  clearSearch(): void {
    this.ftsQuery = '';
    this.loadPatientRecords();
  }

  openModal(): void {
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
