import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fadeIn">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Historias Clínicas y Expediente Electrónico (EHR)
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Signos vitales y recetas en JSONB • Búsqueda Full Text Search en español
          </p>
        </div>
        <button
          (click)="openModal()"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-500/20"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nueva Evolución Clínica
        </button>
      </div>

      <!-- Buscador Clínico Full Text Search -->
      <div class="glass-panel p-4 rounded-xl flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[260px] flex items-center gap-2">
          <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input
            type="text"
            [(ngModel)]="ftsQuery"
            (keyup.enter)="searchFts()"
            placeholder="Búsqueda clínica FTS (ej: hipertensión, bronquial, lumbago, diabetes)..."
            class="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-800 dark:text-slate-200"
          />
        </div>
        <button
          (click)="searchFts()"
          class="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
        >
          Buscar con FTS
        </button>
        <button
          (click)="clearSearch()"
          class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          Ver por Paciente
        </button>
      </div>

      <!-- Selector de Paciente si no está en modo FTS -->
      @if (!isFtsMode()) {
        <div class="flex items-center gap-3">
          <label class="text-xs font-bold text-slate-500 uppercase">Seleccionar Paciente:</label>
          <select
            [(ngModel)]="selectedPatientId"
            (change)="loadPatientRecords()"
            class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm"
          >
            @for (p of patients(); track p.idPaciente) {
              <option [value]="p.idPaciente">{{ p.nombre }} {{ p.apellido }} (DNI: {{ p.dni }})</option>
            }
          </select>
        </div>
      }

      <!-- Línea de Tiempo de Evoluciones Clínicas -->
      <div class="space-y-6">
        @for (r of records(); track r.id_historia || r.idHistoria) {
          <div class="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative">
            <!-- Encabezado de la evolución -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-3">
                <span class="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </span>
                <div>
                  <h3 class="font-bold text-base text-slate-900 dark:text-white">
                    {{ r.diagnostico_descripcion || r.diagnosticoDescripcion }}
                  </h3>
                  <p class="text-xs text-slate-500">
                    Atendido por: <span class="font-medium text-slate-700 dark:text-slate-300">{{ r.medico?.nombre || r.medico }} {{ r.medico?.apellido }}</span>
                    @if (r.paciente?.nombre) {
                      • Paciente: <span class="font-medium text-slate-700 dark:text-slate-300">{{ r.paciente.nombre }} {{ r.paciente.apellido }}</span>
                    }
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                @if (r.diagnostico_codigo_cie || r.diagnosticoCodigoCie) {
                  <span class="px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                    CIE-10: {{ r.diagnostico_codigo_cie || r.diagnosticoCodigoCie }}
                  </span>
                }
                <span class="text-xs font-mono text-slate-400">
                  {{ (r.fecha_atencion || r.fechaAtencion) | date: 'dd/MM/yyyy HH:mm' }}
                </span>
              </div>
            </div>

            <!-- Signos Vitales (JSONB) -->
            @if (r.signos_vitales || r.signosVitales; as sv) {
              <div class="mt-4">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Signos Vitales Registrados</span>
                <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  @if (sv.presion_arterial) {
                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span class="text-[10px] text-slate-400 uppercase font-bold block">Presión Art.</span>
                      <span class="font-bold text-sm text-slate-800 dark:text-slate-100">{{ sv.presion_arterial }} mmHg</span>
                    </div>
                  }
                  @if (sv.frecuencia_cardiaca_lpm) {
                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span class="text-[10px] text-slate-400 uppercase font-bold block">Frecuencia C.</span>
                      <span class="font-bold text-sm text-rose-600 dark:text-rose-400">{{ sv.frecuencia_cardiaca_lpm }} lpm</span>
                    </div>
                  }
                  @if (sv.temperatura_c) {
                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span class="text-[10px] text-slate-400 uppercase font-bold block">Temperatura</span>
                      <span class="font-bold text-sm text-amber-600 dark:text-amber-400">{{ sv.temperatura_c }} °C</span>
                    </div>
                  }
                  @if (sv.peso_kg) {
                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span class="text-[10px] text-slate-400 uppercase font-bold block">Peso</span>
                      <span class="font-bold text-sm text-blue-600 dark:text-blue-400">{{ sv.peso_kg }} kg</span>
                    </div>
                  }
                  @if (sv.oxigeno_pct) {
                    <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span class="text-[10px] text-slate-400 uppercase font-bold block">Saturación O2</span>
                      <span class="font-bold text-sm text-emerald-600 dark:text-emerald-400">{{ sv.oxigeno_pct }}%</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Tratamiento y conducta médica -->
            @if (r.tratamiento) {
              <div class="mt-4 text-xs text-slate-600 dark:text-slate-300">
                <span class="font-bold text-slate-500 uppercase block mb-1">Tratamiento Indicado:</span>
                <p class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl leading-relaxed">
                  {{ r.tratamiento }}
                </p>
              </div>
            }

            <!-- Receta Farmacológica (JSONB Array) -->
            @if (r.receta_medicamentos || r.recetaMedicamentos; as recetas) {
              @if (recetas.length > 0) {
                <div class="mt-4">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Prescripción Farmacológica</span>
                  <div class="flex flex-wrap gap-2">
                    @for (m of recetas; track m.medicamento) {
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <svg class="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"/></svg>
                        <strong>{{ m.medicamento }}</strong> ({{ m.dosis }}) • {{ m.frecuencia }} • {{ m.dias }} días
                      </span>
                    }
                  </div>
                </div>
              }
            }
          </div>
        } @empty {
          <div class="py-12 text-center text-slate-400">
            No hay evoluciones clínicas para mostrar.
          </div>
        }
      </div>

      <!-- Modal de Nueva Evolución Clínica -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-scaleUp my-8">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Nueva Evolución Clínica</h2>
            
            <form (submit)="submitRecord($event)" class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Paciente</label>
                  <select [(ngModel)]="newRecord.idPaciente" name="idPaciente" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                    @for (p of patients(); track p.idPaciente) {
                      <option [value]="p.idPaciente">{{ p.nombre }} {{ p.apellido }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Médico Tratante</label>
                  <select [(ngModel)]="newRecord.idMedico" name="idMedico" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                    @for (d of doctors(); track d.idMedico) {
                      <option [value]="d.idMedico">Dr/a. {{ d.nombre }} {{ d.apellido }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-1">
                  <label class="block text-xs font-semibold mb-1">Cód. CIE-10</label>
                  <input type="text" [(ngModel)]="newRecord.diagnosticoCodigoCie" name="diagnosticoCodigoCie" placeholder="Ej: I10" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-semibold mb-1">Diagnóstico Clínico</label>
                  <input type="text" [(ngModel)]="newRecord.diagnosticoDescripcion" name="diagnosticoDescripcion" required placeholder="Descripción del diagnóstico" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <!-- Signos Vitales en JSONB -->
              <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Signos Vitales (JSONB)</span>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-400">Presión (mmHg)</label>
                    <input type="text" [(ngModel)]="newRecord.signosVitales.presion_arterial" name="pa" placeholder="120/80" class="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 text-xs" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400">Pulso (lpm)</label>
                    <input type="number" [(ngModel)]="newRecord.signosVitales.frecuencia_cardiaca_lpm" name="fc" placeholder="72" class="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 text-xs" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-400">Temp (°C)</label>
                    <input type="number" step="0.1" [(ngModel)]="newRecord.signosVitales.temperatura_c" name="temp" placeholder="36.5" class="w-full bg-white dark:bg-slate-800 border rounded px-2 py-1 text-xs" />
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold mb-1">Tratamiento y Plan Médico</label>
                <textarea [(ngModel)]="newRecord.tratamiento" name="tratamiento" rows="2" placeholder="Indicaciones y cuidados" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm"></textarea>
              </div>

              <!-- Receta dinámica -->
              <div>
                <label class="block text-xs font-semibold mb-1">Medicamento Prescrito (JSONB)</label>
                <div class="grid grid-cols-4 gap-2">
                  <input type="text" [(ngModel)]="drugName" placeholder="Medicamento" class="bg-slate-50 dark:bg-slate-800 border rounded px-2 py-1 text-xs" />
                  <input type="text" [(ngModel)]="drugDose" placeholder="Dosis (50mg)" class="bg-slate-50 dark:bg-slate-800 border rounded px-2 py-1 text-xs" />
                  <input type="text" [(ngModel)]="drugFreq" placeholder="Frecuencia (c/12h)" class="bg-slate-50 dark:bg-slate-800 border rounded px-2 py-1 text-xs" />
                  <input type="number" [(ngModel)]="drugDays" placeholder="Días (30)" class="bg-slate-50 dark:bg-slate-800 border rounded px-2 py-1 text-xs" />
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-3">
                <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400">
                  Cancelar
                </button>
                <button type="submit" class="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md">
                  Guardar Evolución
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
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

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['patientId']) {
        this.selectedPatientId = parseInt(params['patientId'], 10);
      }
      this.loadPatientRecords();
    });

    this.api.getPatients().subscribe((p) => this.patients.set(p));
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
  }

  loadPatientRecords() {
    this.isFtsMode.set(false);
    this.api.getRecordsByPatient(this.selectedPatientId).subscribe({
      next: (data) => this.records.set(data),
      error: (err) => console.error(err),
    });
  }

  searchFts() {
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

  clearSearch() {
    this.ftsQuery = '';
    this.loadPatientRecords();
  }

  openModal() {
    this.newRecord.idPaciente = this.selectedPatientId;
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submitRecord(event: Event) {
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
      error: (err) => alert(err.error?.message || 'Error al guardar evolución'),
    });
  }
}
