import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patients.component.html',
})
export class PatientsComponent implements OnInit {
  private readonly api = inject(ApiService);

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

  ngOnInit(): void {
    this.loadPatients();
    this.loadCatalogs();
  }

  loadPatients(): void {
    this.api.getPatients(this.searchQuery).subscribe({
      next: (data) => this.patients.set(data),
      error: (err) => console.error('Error al cargar pacientes:', err),
    });
  }

  loadCatalogs(): void {
    this.api.getInsurances().subscribe((os) => this.insurances.set(os));
    this.api.getCountries().subscribe((c) => this.countries.set(c));
  }

  onSearch(): void {
    this.loadPatients();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadPatients();
  }

  openModal(): void {
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitPatient(event: Event): void {
    event.preventDefault();
    this.api.createPatient(this.newPatient).subscribe({
      next: () => {
        this.closeModal();
        this.loadPatients();
      },
      error: (err) => alert(err.error?.message || 'Error al registrar paciente'),
    });
  }
}
