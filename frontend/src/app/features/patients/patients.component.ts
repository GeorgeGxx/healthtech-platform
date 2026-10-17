import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patients.component.html',
})
export class PatientsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthStateService);

  readonly patients = signal<any[]>([]);
  readonly insurances = signal<any[]>([]);
  readonly countries = signal<any[]>([]);
  readonly showModal = signal<boolean>(false);

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
      // Reacciona al cambio de rol en el switcher superior
      const user = this.auth.currentUser();
      this.loadPatients();
    });
  }

  ngOnInit(): void {
    this.loadPatients();
    this.loadCatalogs();
  }

  loadPatients(): void {
    if (this.auth.isBasicUser()) {
      // Juan Pérez García solo ve su propia información
      this.api.getPatients('Juan').subscribe({
        next: (data) => {
          const personal = data.filter(
            (p) => p.nombre?.toLowerCase().includes('juan') || p.idPaciente === 1
          );
          if (personal.length > 0) {
            this.patients.set(personal);
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
                obraSocial: 'GNP Seguros (Póliza 88992)',
                nacionalidad: 'Mexicana',
                genero: 'M',
              },
            ]);
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
              obraSocial: 'GNP Seguros (Póliza 88992)',
              nacionalidad: 'Mexicana',
              genero: 'M',
            },
          ]);
        },
      });
    } else {
      // Recepción ve el padrón completo
      this.api.getPatients(this.searchQuery).subscribe({
        next: (data) => this.patients.set(data),
        error: (err) => console.error('Error al cargar pacientes:', err),
      });
    }
  }

  loadCatalogs(): void {
    this.api.getInsurances().subscribe((os) => this.insurances.set(os));
    this.api.getCountries().subscribe((c) => this.countries.set(c));
  }

  onSearch(): void {
    if (!this.auth.isBasicUser()) {
      this.loadPatients();
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
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
      error: (err) => console.error('Error al registrar paciente:', err),
    });
  }
}
