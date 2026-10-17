import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 animate-fadeIn">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Cuerpo Médico y Organigrama
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Estructura jerárquica médica con CTEs recursivas de PostgreSQL • Especialidades asociadas
          </p>
        </div>
      </div>

      <!-- Organigrama Jerárquico (WITH RECURSIVE de PostgreSQL) -->
      <div class="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          Organigrama Jerárquico Hospitalario (WITH RECURSIVE)
        </h2>

        <div class="space-y-3 font-mono text-xs">
          @for (node of hierarchy(); track node.id_medico) {
            <div
              class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              [style.margin-left.rem]="(node.nivel_jerarquico - 1) * 1.5"
            >
              <span class="text-slate-400">└─</span>
              <span class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                [ngClass]="{
                  'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300': node.nivel_jerarquico === 1,
                  'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300': node.nivel_jerarquico === 2,
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300': node.nivel_jerarquico === 3,
                  'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300': node.nivel_jerarquico === 4
                }">
                N{{ node.nivel_jerarquico }}
              </span>
              <div class="flex-1 font-sans">
                <p class="font-bold text-sm text-slate-900 dark:text-white">{{ node.medico }}</p>
                <p class="text-xs text-slate-400 font-mono">{{ node.matricula }} • {{ node.email }}</p>
              </div>
              <span class="text-[11px] text-slate-400 italic hidden sm:inline">
                {{ node.camino_reporte }}
              </span>
            </div>
          }
        </div>
      </div>

      <!-- Tarjetas de Médicos de Planta y Especialidades -->
      <div>
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Médicos en Actividad
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (doc of doctors(); track doc.idMedico) {
            <div class="glass-panel p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {{ doc.nombre.charAt(0) }}{{ doc.apellido.charAt(0) }}
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-900 dark:text-white">
                      Dr/a. {{ doc.nombre }} {{ doc.apellido }}
                    </h3>
                    <p class="text-xs font-mono text-slate-400">Matrícula: {{ doc.matricula }}</p>
                  </div>
                </div>

                <!-- Especialidades -->
                <div class="mt-4">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Especialidades</span>
                  <div class="flex flex-wrap gap-1.5">
                    @for (esp of doc.especialidades; track esp.idEspecialidad) {
                      <span class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {{ esp.nombre }}
                      </span>
                    }
                  </div>
                </div>

                <!-- Jefe Directo -->
                <div class="mt-4 text-xs text-slate-500">
                  <span>Reporta a: </span>
                  <strong class="text-slate-700 dark:text-slate-300">
                    {{ doc.jefeDirecto ? ('Dr/a. ' + doc.jefeDirecto.nombre + ' ' + doc.jefeDirecto.apellido) : 'Dirección General' }}
                  </strong>
                </div>
              </div>

              <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Ingreso: {{ doc.fechaIngreso }}</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-semibold">● Activo</span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class StaffComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly doctors = signal<any[]>([]);
  readonly hierarchy = signal<any[]>([]);

  ngOnInit() {
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
    this.api.getDoctorHierarchy().subscribe((h) => this.hierarchy.set(h));
  }
}
