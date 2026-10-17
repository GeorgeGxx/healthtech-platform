import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-fadeIn">
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Facturación y Liquidaciones
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión de cobranzas, coseguros de obras sociales y comprobantes fiscales
          </p>
        </div>
        <button
          (click)="openModal()"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-md shadow-amber-500/20"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Registrar Cobro
        </button>
      </div>

      <!-- Resumen por Método de Pago -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        @for (item of summary(); track item.metodo_pago) {
          <div class="glass-panel p-4 rounded-xl shadow-sm">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {{ item.metodo_pago.replace('_', ' ') }}
            </span>
            <p class="text-xl font-extrabold text-slate-900 dark:text-white">
              \${{ item.total_recaudado | number: '1.0-0' }}
            </p>
            <span class="text-xs text-slate-500 block mt-1">
              {{ item.total_transacciones }} operaciones
            </span>
          </div>
        }
      </div>

      <!-- Tabla de Pagos Registrados -->
      <div class="glass-panel rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead class="bg-slate-50/80 dark:bg-slate-800/80 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th class="px-5 py-3">Comprobante</th>
                <th class="px-5 py-3">Fecha</th>
                <th class="px-5 py-3">Paciente</th>
                <th class="px-5 py-3">Concepto</th>
                <th class="px-5 py-3 text-right">Monto Bruto</th>
                <th class="px-5 py-3 text-right">Cobertura OS</th>
                <th class="px-5 py-3 text-right">Neto Cobrado</th>
                <th class="px-5 py-3 text-center">Método</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (p of payments(); track p.idPago) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td class="px-5 py-3.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {{ p.comprobanteFiscal || ('FAC-' + p.idPago) }}
                  </td>
                  <td class="px-5 py-3.5 text-xs text-slate-500">
                    {{ p.fechaPago | date: 'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td class="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                    {{ p.paciente?.nombre }} {{ p.paciente?.apellido }}
                  </td>
                  <td class="px-5 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                    {{ p.concepto?.nombre }}
                  </td>
                  <td class="px-5 py-3.5 text-right font-mono text-xs">
                    \${{ p.montoBruto | number: '1.2-2' }}
                  </td>
                  <td class="px-5 py-3.5 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    -\${{ p.descuentoCobertura | number: '1.2-2' }}
                  </td>
                  <td class="px-5 py-3.5 text-right font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                    \${{ p.montoNeto | number: '1.2-2' }}
                  </td>
                  <td class="px-5 py-3.5 text-center">
                    <span class="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {{ p.metodoPago.replace('_', ' ') }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="px-5 py-8 text-center text-slate-400">
                    No hay liquidaciones registradas.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Registro de Pago -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Registrar Nuevo Cobro</h2>

            <form (submit)="submitPayment($event)" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold mb-1">Paciente</label>
                <select [(ngModel)]="newPayment.idPaciente" name="idPaciente" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                  @for (p of patients(); track p.idPaciente) {
                    <option [value]="p.idPaciente">{{ p.nombre }} {{ p.apellido }} (DNI: {{ p.dni }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold mb-1">Concepto de Cobro</label>
                <select [(ngModel)]="newPayment.idConcepto" name="idConcepto" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                  @for (c of concepts(); track c.idConcepto) {
                    <option [value]="c.idConcepto">{{ c.nombre }}</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Monto Bruto (\$) </label>
                  <input type="number" step="0.01" [(ngModel)]="newPayment.montoBruto" name="montoBruto" required class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Método de Pago</label>
                  <select [(ngModel)]="newPayment.metodoPago" name="metodoPago" class="w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm">
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta_debito">Tarjeta Débito</option>
                    <option value="tarjeta_credito">Tarjeta Crédito</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="obra_social">Obra Social (Total)</option>
                  </select>
                </div>
              </div>

              <p class="text-[11px] text-slate-500 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900">
                💡 El sistema aplicará automáticamente la regla de dominio de cobertura según la obra social del paciente seleccionado.
              </p>

              <div class="flex items-center justify-end gap-3 pt-2">
                <button type="button" (click)="closeModal()" class="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                  Cancelar
                </button>
                <button type="submit" class="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md">
                  Emitir Comprobante
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class BillingComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly payments = signal<any[]>([]);
  readonly summary = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly concepts = signal<any[]>([]);
  readonly showModal = signal<boolean>(false);

  newPayment: any = {
    idPaciente: 4,
    idConcepto: 1,
    montoBruto: 25000,
    metodoPago: 'tarjeta_debito',
  };

  ngOnInit() {
    this.loadData();
    this.api.getPatients().subscribe((p) => this.patients.set(p));
    this.api.getBillingConcepts().subscribe((c) => this.concepts.set(c));
  }

  loadData() {
    this.api.getPayments().subscribe((p) => this.payments.set(p));
    this.api.getBillingSummary().subscribe((s) => this.summary.set(s));
  }

  openModal() {
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  submitPayment(event: Event) {
    event.preventDefault();
    this.api.createPayment(this.newPayment).subscribe({
      next: () => {
        this.closeModal();
        this.loadData();
      },
      error: (err) => alert(err.error?.message || 'Error al registrar cobro'),
    });
  }
}
