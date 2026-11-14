import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ClinicalModalComponent } from '../../shared/components/clinical-modal/clinical-modal.component';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ClinicalModalComponent],
  templateUrl: './patients.component.html',
})
export class PatientsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthStateService);

  readonly patients = signal<any[]>([]);
  readonly insurances = signal<any[]>([]);
  readonly countries = signal<any[]>([]);
  readonly showModal = signal<boolean>(false);
  readonly fhirPatientData = signal<any | null>(null);
  readonly showFhirPatientModal = signal<boolean>(false);
  readonly isFhirLoading = signal<boolean>(false);

  searchQuery: string = '';

  newPatient: any = {
    nombre: '',
    apellido: '',
    dni: '',
    genero: 'M',
    fechaNacimiento: '1995-01-01',
    idPais: 'MEX',
    idObraSocial: null,
    numeroAfiliado: '',
    telefono: '',
    email: '',
  };

  constructor() {
    effect(() => {
      // Reacts to role change in the top switcher
      const user = this.auth.currentUser();
      this.loadPatients();
    });
  }

  ngOnInit(): void {
    this.loadPatients();
    this.loadCatalogs();
  }

  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(6);
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(1);

  loadPatients(): void {
    if (this.auth.isBasicUser()) {
      // Juan Pérez García only sees his own information
      this.api.getPatients('Juan').subscribe({
        next: (res) => {
          const raw = Array.isArray(res) ? res : (res.data || []);
          const personal = raw.filter(
            (p: any) => p.nombre?.toLowerCase().includes('juan') || p.idPaciente === 1,
          );
          if (personal.length > 0) {
            this.patients.set(personal);
            this.totalItems.set(personal.length);
            this.totalPages.set(1);
          } else {
            this.patients.set([
              {
                idPaciente: 1,
                nombre: 'Juan',
                apellido: 'Pérez García',
                dni: '28456123',
                curp: 'PEGA850412HDFRRN09',
                email: 'juan.perez@email.com',
                telefono: '+52 55 1234-5678',
                obraSocial: 'GNP Insurance (Policy 88992)',
                nacionalidad: 'Mexican',
                genero: 'M',
              },
            ]);
            this.totalItems.set(1);
            this.totalPages.set(1);
          }
        },
        error: () => {
          this.patients.set([
            {
              idPaciente: 1,
              nombre: 'Juan',
              apellido: 'Pérez García',
              dni: '28456123',
              curp: 'PEGA850412HDFRRN09',
              email: 'juan.perez@email.com',
              telefono: '+52 55 1234-5678',
              obraSocial: 'GNP Insurance (Policy 88992)',
              nacionalidad: 'Mexican',
              genero: 'M',
            },
          ]);
          this.totalItems.set(1);
          this.totalPages.set(1);
        },
      });
    } else {
      // Reception sees the paginated registry
      this.api.getPatients(this.searchQuery, this.currentPage(), this.pageSize()).subscribe({
        next: (res) => {
          if (Array.isArray(res)) {
            this.patients.set(res);
            this.totalItems.set(res.length);
            this.totalPages.set(Math.max(1, Math.ceil(res.length / this.pageSize())));
          } else {
            this.patients.set(res.data || []);
            this.totalItems.set(res.total || 0);
            this.totalPages.set(res.totalPages || 1);
            this.currentPage.set(res.page || 1);
          }
        },
        error: (err) => console.error('Error loading patients:', err),
      });
    }
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadPatients();
    }
  }

  loadCatalogs(): void {
    this.api.getInsurances().subscribe((os) => this.insurances.set(os));
    this.api.getCountries().subscribe((c) => this.countries.set(c));
  }

  onSearch(): void {
    if (!this.auth.isBasicUser()) {
      this.currentPage.set(1);
      this.loadPatients();
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage.set(1);
    this.loadPatients();
  }


  openModal(): void {
    if (this.auth.isAdmin()) {
      this.showModal.set(true);
    }
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  savePatient(): void {
    this.api.createPatient(this.newPatient).subscribe({
      next: () => {
        this.closeModal();
        this.loadPatients();
      },
      error: (err) => console.error('Error registering patient:', err),
    });
  }

  openFhirPatientModal(patient: any): void {
    const id = patient.idPaciente || patient.id || 1;
    this.isFhirLoading.set(true);
    this.api.getPatientFhir(id).subscribe({
      next: (res) => {
        this.fhirPatientData.set(res);
        this.showFhirPatientModal.set(true);
        this.isFhirLoading.set(false);
      },
      error: (err) => {
        this.isFhirLoading.set(false);
        console.error('Error fetching HL7 FHIR Patient:', err);
      },
    });
  }

  closeFhirPatientModal(): void {
    this.showFhirPatientModal.set(false);
    this.fhirPatientData.set(null);
  }

  copyFhirPatientJson(): void {
    if (this.fhirPatientData() && navigator?.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(this.fhirPatientData(), null, 2));
    }
  }
}
