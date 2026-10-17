import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6 animate-fadeIn">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Directorio de Pacientes
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión demográfica, afiliaciones a obras sociales y fichas médicas
          </p>
        </div>
        <button
          (click)="openModal()"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-500/20"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
          Registrar Paciente
        </button>
      </div>

      <!-- Barra de búsqueda rápida -->
      <div class="glass-panel p-4 rounded-xl flex items-center gap-3">
        <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (input)="onSearch()"
          placeholder="Buscar por DNI, Nombre, Apellido o Correo..."
          class="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-800 dark:text-slate-200"
        />
        @if (searchQuery) {
          <button (click)="clearSearch()" class="text-xs text-slate-400 hover:text-slate-600">Limpiar</button>
        }
      </div>

      <!-- Grid de Fichas de Pacientes -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        @for (p of patients(); track p.idPaciente) {
          <div class="glass-panel p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border border-slate-200/80 dark:border-slate-800">
            <div>
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-sm">
                    {{ p.nombre.charAt(0) }}{{ p.apellido.charAt(0) }}
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {{ p.nombre }} {{ p.apellido }}
                    </h3>
                    <p class="text-xs font-mono text-slate-400">DNI: {{ p.dni }}</p>
                  </div>
                </div>
                <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {{ p.edad }} años
                </span>
              </div>

              <div class="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div class="flex items-center justify-between">
                  <span>Obra Social:</span>
                  <span class="font-medium text-slate-700 dark:text-slate-300">
                    {{ p.obraSocial?.nombre || 'Particular' }}
                    @if (p.obraSocial?.porcentajeCobertura) {
                      ({{ p.obraSocial.porcentajeCobertura }}%)
                    }
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span>País / Nacionalidad:</span>
                  <span class="font-medium text-slate-700 dark:text-slate-300">
                    {{ p.pais?.nombre || p.idPais }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Contacto:</span>
                  <span class="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                    {{ p.email || p.telefono || 'Sin datos' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span class="text-[11px] text-slate-400">Reg: {{ p.fechaRegistro | date: 'dd/MM/yyyy' }}</span>
              <a
                [routerLink]="['/medical-records']"
                [queryParams]="{ patientId: p.idPaciente }"
                class="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Historia Clínica &rarr;
              </a>
            </div>
          </div>
        } @empty {
          <div class="col-span-full py-12 text-center text-slate-400">
            No se encontraron pacientes que coincidan con la búsqueda.
          </div>
        }
      </div>

      <!-- Modal de Registro de Paciente -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scaleUp">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Registrar Nuevo Paciente</h2>
            
            <form (submit)="submitPatient($event)" class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Nombre</label>
                  <input type="text" [(ngModel)]="newPatient.nombre" name="nombre" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Apellido</label>
                  <input type="text" [(ngModel)]="newPatient.apellido" name="apellido" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">DNI / Documento</label>
                  <input type="text" [(ngModel)]="newPatient.dni" name="dni" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Género</label>
                  <select [(ngModel)]="newPatient.genero" name="genero" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Fecha de Nacimiento</label>
                  <input type="date" [(ngModel)]="newPatient.fechaNacimiento" name="fechaNacimiento" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">País</label>
                  <select [(ngModel)]="newPatient.idPais" name="idPais" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                    @for (country of countries(); track country.idPais) {
                      <option [value]="country.idPais">{{ country.nombre }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Obra Social / Seguro</label>
                  <select [(ngModel)]="newPatient.idObraSocial" name="idObraSocial" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                    <option [ngValue]="null">Particular / Sin Cobertura</option>
                    @for (os of insurances(); track os.idObraSocial) {
                      <option [value]="os.idObraSocial">{{ os.nombre }} ({{ os.porcentajeCobertura }}%)</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">N° Afiliado</label>
                  <input type="text" [(ngModel)]="newPatient.numeroAfiliado" name="numeroAfiliado" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Teléfono</label>
                  <input type="text" [(ngModel)]="newPatient.telefono" name="telefono" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Email</label>
                  <input type="email" [(ngModel)]="newPatient.email" name="email" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-3">
                <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400">
                  Cancelar
                </button>
                <button type="submit" class="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md">
                  Guardar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
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
    idPais: 'ARG',
    idObraSocial: null,
    numeroAfiliado: '',
    telefono: '',
    email: '',
  };

  ngOnInit() {
    this.loadPatients();
    this.loadCatalogs();
  }

  loadPatients() {
    this.api.getPatients(this.searchQuery).subscribe({
      next: (data) => this.patients.set(data),
      error: (err) => console.error('Error al cargar pacientes:', err),
    });
  }

  loadCatalogs() {
    this.api.getInsurances().subscribe((os) => this.insurances.set(os));
    this.api.getCountries().subscribe((c) => this.countries.set(c));
  }

  onSearch() {
    this.loadPatients();
  }

  clearSearch() {
    this.searchQuery = '';
    this.loadPatients();
  }

  openModal() {
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submitPatient(event: Event) {
    event.preventDefault();
    this.api.createPatient(this.newPatient).subscribe({
      next: () => {
        this.closeModal();
        this.loadPatients();
      },
      error: (err) => alert(err.error?.message || 'Error al guardar paciente'),
    });
  }
}
