import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-hospitalizations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fadeIn">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Censo de Camas e Internaciones
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión de piso hospitalario, admisiones y altas con devengamiento de costos
          </p>
        </div>
        <button
          (click)="openAdmitModal()"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md shadow-rose-500/20"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nueva Admisión
        </button>
      </div>

      <!-- Mapa Visual de Habitaciones y Camas -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        @for (bed of bedCensus(); track bed.idHabitacion) {
          <div
            class="glass-panel p-5 rounded-2xl shadow-sm border transition-all flex flex-col justify-between"
            [ngClass]="{
              'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10': bed.ocupada,
              'border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10': !bed.ocupada
            }"
          >
            <div>
              <div class="flex items-start justify-between">
                <div>
                  <span class="text-xs font-mono text-slate-400 block uppercase font-bold">Piso {{ bed.piso }}</span>
                  <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {{ bed.numero }}
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider"
                      [ngClass]="{
                        'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300': bed.tipo === 'terapia_intensiva',
                        'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300': bed.tipo === 'individual',
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300': bed.tipo === 'general'
                      }">
                      {{ bed.tipo }}
                    </span>
                  </h3>
                </div>
                <span
                  class="px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider"
                  [ngClass]="{
                    'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300': bed.ocupada,
                    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300': !bed.ocupada
                  }"
                >
                  {{ bed.ocupada ? 'Ocupada' : 'Disponible' }}
                </span>
              </div>

              <!-- Detalle de la Cama -->
              <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                @if (bed.ocupada && bed.pacienteActual) {
                  <div class="space-y-1.5">
                    <p class="font-bold text-sm text-slate-900 dark:text-white">
                      {{ bed.pacienteActual.nombreCompleto }}
                    </p>
                    <p class="text-slate-500">
                      Médico: <strong class="text-slate-700 dark:text-slate-300">{{ bed.pacienteActual.medicoResponsable }}</strong>
                    </p>
                    <p class="text-slate-500">
                      Ingreso: <strong class="text-slate-700 dark:text-slate-300">{{ bed.pacienteActual.fechaIngreso | date: 'dd/MM/yyyy HH:mm' }}</strong>
                    </p>
                    <p class="text-slate-600 dark:text-slate-400 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] line-clamp-2">
                      {{ bed.pacienteActual.diagnosticoIngreso }}
                    </p>
                  </div>
                } @else {
                  <div class="py-4 text-center text-slate-400">
                    <p class="font-medium text-emerald-600 dark:text-emerald-400">Lista para asignación</p>
                    <p class="text-[11px] text-slate-500 mt-1">Arancel: \${{ bed.costoDia | number: '1.0-0' }} / día</p>
                  </div>
                }
              </div>
            </div>

            <!-- Acciones -->
            <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end">
              @if (bed.ocupada && bed.pacienteActual) {
                <button
                  (click)="openDischargeModal(bed.pacienteActual.idInternacion)"
                  class="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900"
                >
                  Conceder Alta Médica
                </button>
              } @else {
                <button
                  (click)="quickAdmit(bed.idHabitacion)"
                  class="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900"
                >
                  Asignar Paciente
                </button>
              }
            </div>
          </div>
        }
      </div>

      <!-- Modal de Alta Médica -->
      @if (showDischargeModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Conceder Alta Hospitalaria</h2>
            <p class="text-xs text-slate-500 mb-4">El sistema calculará automáticamente los días devengados y el costo total de estancia.</p>

            <form (submit)="confirmDischarge($event)" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold mb-1">Motivo / Resumen de Alta</label>
                <textarea
                  [(ngModel)]="dischargeReason"
                  name="reason"
                  required
                  rows="3"
                  placeholder="Detalle la evolución favorable o criterio de egreso..."
                  class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm"
                ></textarea>
              </div>

              <div class="flex items-center justify-end gap-3 pt-2">
                <button type="button" (click)="closeDischargeModal()" class="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                  Cancelar
                </button>
                <button type="submit" class="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md">
                  Confirmar Egreso
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal de Admisión -->
      @if (showAdmitModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Nueva Admisión en Cama</h2>

            <form (submit)="confirmAdmit($event)" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold mb-1">Paciente</label>
                <select [(ngModel)]="admitData.idPaciente" name="idPaciente" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                  @for (p of patients(); track p.idPaciente) {
                    <option [value]="p.idPaciente">{{ p.nombre }} {{ p.apellido }} (DNI: {{ p.dni }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold mb-1">Médico Responsable</label>
                <select [(ngModel)]="admitData.idMedicoResponsable" name="idMedicoResponsable" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                  @for (d of doctors(); track d.idMedico) {
                    <option [value]="d.idMedico">Dr/a. {{ d.nombre }} {{ d.apellido }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold mb-1">Habitación / Cama</label>
                <select [(ngModel)]="admitData.idHabitacion" name="idHabitacion" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                  @for (b of bedCensus(); track b.idHabitacion) {
                    @if (!b.ocupada) {
                      <option [value]="b.idHabitacion">{{ b.numero }} ({{ b.tipo }}) - Piso {{ b.piso }}</option>
                    }
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold mb-1">Diagnóstico de Ingreso</label>
                <textarea [(ngModel)]="admitData.diagnosticoIngreso" name="diagnostico" required rows="2" placeholder="Motivo clínico de la internación..." class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm"></textarea>
              </div>

              <div class="flex items-center justify-end gap-3 pt-2">
                <button type="button" (click)="closeAdmitModal()" class="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                  Cancelar
                </button>
                <button type="submit" class="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md">
                  Ingresar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class HospitalizationsComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly bedCensus = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly doctors = signal<any[]>([]);

  readonly showDischargeModal = signal<boolean>(false);
  readonly showAdmitModal = signal<boolean>(false);

  selectedStayId: number | null = null;
  dischargeReason: string = '';

  admitData: any = {
    idPaciente: 4,
    idMedicoResponsable: 2,
    idHabitacion: 1,
    diagnosticoIngreso: '',
  };

  ngOnInit() {
    this.loadCensus();
    this.api.getPatients().subscribe((p) => this.patients.set(p));
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
  }

  loadCensus() {
    this.api.getBedCensus().subscribe({
      next: (data) => this.bedCensus.set(data),
      error: (err) => console.error(err),
    });
  }

  openDischargeModal(stayId: number) {
    this.selectedStayId = stayId;
    this.dischargeReason = 'Alta médica por resolución clínica satisfactoria';
    this.showDischargeModal.set(true);
  }

  closeDischargeModal() {
    this.showDischargeModal.set(false);
  }

  confirmDischarge(event: Event) {
    event.preventDefault();
    if (!this.selectedStayId) return;

    this.api.dischargePatient(this.selectedStayId, this.dischargeReason).subscribe({
      next: () => {
        this.closeDischargeModal();
        this.loadCensus();
      },
      error: (err) => alert(err.error?.message || 'Error al conceder alta'),
    });
  }

  openAdmitModal() {
    this.showAdmitModal.set(true);
  }

  quickAdmit(roomId: number) {
    this.admitData.idHabitacion = roomId;
    this.showAdmitModal.set(true);
  }

  closeAdmitModal() {
    this.showAdmitModal.set(false);
  }

  confirmAdmit(event: Event) {
    event.preventDefault();
    this.api.admitPatient(this.admitData).subscribe({
      next: () => {
        this.closeAdmitModal();
        this.loadCensus();
      },
      error: (err) => alert(err.error?.message || 'Error al admitir paciente'),
    });
  }
}
