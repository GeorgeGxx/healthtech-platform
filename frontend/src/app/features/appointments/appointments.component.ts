import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fadeIn">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Agenda de Turnos Médicos
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Programación de citas con validación anti-solapamiento GIST
          </p>
        </div>
        <button
          (click)="openModal()"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Agendar Nuevo Turno
        </button>
      </div>

      <!-- Filtros de búsqueda -->
      <div class="glass-panel p-4 rounded-xl flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Filtrar por Médico</label>
          <select
            [(ngModel)]="selectedDoctorId"
            (change)="loadAppointments()"
            class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm"
          >
            <option [value]="0">Todos los Médicos</option>
            @for (doc of doctors(); track doc.idMedico) {
              <option [value]="doc.idMedico">Dr/a. {{ doc.nombre }} {{ doc.apellido }}</option>
            }
          </select>
        </div>
        <div class="w-full sm:w-auto">
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Filtrar por Fecha</label>
          <input
            type="date"
            [(ngModel)]="selectedDate"
            (change)="loadAppointments()"
            class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <div class="pt-5">
          <button
            (click)="resetFilters()"
            class="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <!-- Tabla de Turnos -->
      <div class="glass-panel rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead class="bg-slate-50/80 dark:bg-slate-800/80 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th class="px-5 py-3">Horario</th>
                <th class="px-5 py-3">Paciente</th>
                <th class="px-5 py-3">Médico</th>
                <th class="px-5 py-3">Especialidad</th>
                <th class="px-5 py-3">Consultorio</th>
                <th class="px-5 py-3">Estado</th>
                <th class="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (t of appointments(); track t.idTurno) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td class="px-5 py-3.5 font-mono text-xs">
                    {{ t.fechaInicio ? (t.fechaInicio | date: 'dd/MM/yyyy HH:mm') : 'Sin fecha' }}
                  </td>
                  <td class="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                    {{ t.paciente?.nombre }} {{ t.paciente?.apellido }}
                    <span class="block text-xs font-normal text-slate-400">DNI: {{ t.paciente?.dni }}</span>
                  </td>
                  <td class="px-5 py-3.5">
                    Dr/a. {{ t.medico?.nombre }} {{ t.medico?.apellido }}
                  </td>
                  <td class="px-5 py-3.5">
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      {{ t.especialidad?.nombre }}
                    </span>
                  </td>
                  <td class="px-5 py-3.5 text-xs text-slate-500">
                    {{ t.consultorio?.codigo || 'Sin asignar' }}
                  </td>
                  <td class="px-5 py-3.5">
                    <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider"
                      [ngClass]="{
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300': t.estado === 'atendido',
                        'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300': t.estado === 'confirmado',
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300': t.estado === 'pendiente',
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300': t.estado === 'cancelado',
                        'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300': t.estado === 'ausente'
                      }">
                      {{ t.estado }}
                    </span>
                  </td>
                  <td class="px-5 py-3.5 text-right space-x-1">
                    @if (t.estado !== 'atendido' && t.estado !== 'cancelado') {
                      <button
                        (click)="changeStatus(t.idTurno, 'atendido')"
                        class="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded"
                        title="Marcar Atendido"
                      >
                        Atendido
                      </button>
                      <button
                        (click)="changeStatus(t.idTurno, 'cancelado')"
                        class="px-2 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded"
                        title="Cancelar Turno"
                      >
                        Cancelar
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-5 py-8 text-center text-slate-400">
                    No se encontraron turnos con los filtros seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Nuevo Turno -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scaleUp">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Agendar Nuevo Turno</h2>
            
            @if (errorMessage()) {
              <div class="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
                {{ errorMessage() }}
              </div>
            }

            <form (submit)="submitAppointment($event)" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold mb-1">Paciente</label>
                <select [(ngModel)]="newApp.idPaciente" name="idPaciente" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                  @for (p of patients(); track p.idPaciente) {
                    <option [value]="p.idPaciente">{{ p.nombre }} {{ p.apellido }} (DNI: {{ p.dni }})</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Médico</label>
                  <select [(ngModel)]="newApp.idMedico" name="idMedico" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                    @for (d of doctors(); track d.idMedico) {
                      <option [value]="d.idMedico">Dr/a. {{ d.nombre }} {{ d.apellido }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Especialidad</label>
                  <select [(ngModel)]="newApp.idEspecialidad" name="idEspecialidad" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                    @for (e of specialties(); track e.idEspecialidad) {
                      <option [value]="e.idEspecialidad">{{ e.nombre }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Inicio (Fecha y Hora)</label>
                  <input type="datetime-local" [(ngModel)]="newApp.inicio" name="inicio" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Fin (Fecha y Hora)</label>
                  <input type="datetime-local" [(ngModel)]="newApp.fin" name="fin" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold mb-1">Consultorio</label>
                <select [(ngModel)]="newApp.idConsultorio" name="idConsultorio" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                  <option [ngValue]="null">Sin consultorio específico</option>
                  @for (c of offices(); track c.idConsultorio) {
                    <option [value]="c.idConsultorio">{{ c.codigo }} - Piso {{ c.piso }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold mb-1">Motivo de Consulta</label>
                <input type="text" [(ngModel)]="newApp.motivoConsulta" name="motivoConsulta" placeholder="Ej: Control rutinario" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
              </div>

              <div class="flex items-center justify-end gap-3 pt-3">
                <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400">
                  Cancelar
                </button>
                <button type="submit" class="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md">
                  Confirmar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class AppointmentsComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly appointments = signal<any[]>([]);
  readonly doctors = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly specialties = signal<any[]>([]);
  readonly offices = signal<any[]>([]);
  readonly showModal = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  selectedDoctorId: number = 0;
  selectedDate: string = '';

  newApp: any = {
    idPaciente: 1,
    idMedico: 2,
    idEspecialidad: 2,
    idConsultorio: 3,
    inicio: '',
    fin: '',
    motivoConsulta: '',
  };

  ngOnInit() {
    this.loadAppointments();
    this.loadCatalogs();
  }

  loadAppointments() {
    const docId = this.selectedDoctorId > 0 ? this.selectedDoctorId : undefined;
    const date = this.selectedDate || undefined;
    this.api.getAppointments(docId, date).subscribe({
      next: (data) => this.appointments.set(data),
      error: (err) => console.error('Error al cargar turnos:', err),
    });
  }

  loadCatalogs() {
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
    this.api.getPatients().subscribe((p) => this.patients.set(p));
    this.api.getSpecialties().subscribe((s) => this.specialties.set(s));
    this.api.getOffices().subscribe((o) => this.offices.set(o));
  }

  resetFilters() {
    this.selectedDoctorId = 0;
    this.selectedDate = '';
    this.loadAppointments();
  }

  changeStatus(id: number, status: string) {
    this.api.updateAppointmentStatus(id, status).subscribe({
      next: () => this.loadAppointments(),
      error: (err) => alert('Error al actualizar estado: ' + err.message),
    });
  }

  openModal() {
    this.errorMessage.set(null);
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const end = new Date(now.getTime() + 30 * 60000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const toInputFormat = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    this.newApp.inicio = toInputFormat(now);
    this.newApp.fin = toInputFormat(end);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submitAppointment(event: Event) {
    event.preventDefault();
    this.errorMessage.set(null);

    const payload = {
      ...this.newApp,
      inicio: new Date(this.newApp.inicio).toISOString(),
      fin: new Date(this.newApp.fin).toISOString(),
    };

    this.api.createAppointment(payload).subscribe({
      next: () => {
        this.closeModal();
        this.loadAppointments();
      },
      error: (err) => {
        this.errorMessage.set(
          err.error?.message || 'Error al agendar turno. Verifique posibles solapamientos.',
        );
      },
    });
  }
}
