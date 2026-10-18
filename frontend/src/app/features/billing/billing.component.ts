import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing.component.html',
})
export class BillingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly payments = signal<any[]>([]);
  readonly summary = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly concepts = signal<any[]>([]);
  readonly showModal = signal<boolean>(false);

  // Paginación Reactiva
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(5);

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.payments().length / this.pageSize()));
  });

  readonly pagedPayments = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.payments().slice(start, start + this.pageSize());
  });

  readonly startIndex = computed(() => {
    return this.payments().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.payments().length);
  });

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  setPageSize(size: any): void {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  newPayment: any = {
    idPaciente: 4,
    idConcepto: 1,
    montoBruto: 25000,
    metodoPago: 'tarjeta_debito',
  };

  ngOnInit(): void {
    this.loadData();
    this.api.getPatients().subscribe((p) => this.patients.set(p));
    this.api.getBillingConcepts().subscribe((c) => this.concepts.set(c));
  }

  loadData(): void {
    this.api.getPayments().subscribe((p) => this.payments.set(p));
    this.api.getBillingSummary().subscribe((s) => this.summary.set(s));
  }

  openModal(): void {
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitPayment(event: Event): void {
    event.preventDefault();
    this.api.createPayment(this.newPayment).subscribe({
      next: () => {
        this.closeModal();
        this.loadData();
        this.toast.success('Comprobante fiscal y pago registrados exitosamente.');
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Error al emitir comprobante de pago.');
      },
    });
  }

  printReceipt(p: any): void {
    const patName = p.paciente ? `${p.paciente.nombre} ${p.paciente.apellido}` : 'Público General';
    const patDni = p.paciente?.dni || 'N/A';
    const folio = p.comprobanteFiscal || `REC-${p.idPago}`;
    const dateStr = new Date(p.fechaPago || Date.now()).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const concepto = p.concepto?.nombre || 'Consulta / Servicio Hospitalario';
    const bruto = Number(p.montoBruto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    const desc = Number(p.descuentoCobertura || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    const neto = Number(p.montoNeto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    const metodo = (p.metodoPago || 'efectivo').replace('_', ' ').toUpperCase();

    const printWindow = window.open('', '_blank', 'width=750,height=850');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <title>Recibo de Cobro Hospitalario - Folio ${folio}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 12px; margin-bottom: 20px; }
          .logo { font-size: 20px; font-weight: 900; color: #b45309; }
          .sub { font-size: 11px; color: #64748b; margin-top: 3px; }
          .badge { background: #fef3c7; border: 1px solid #fde68a; color: #92400e; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
          .section { margin-bottom: 16px; padding: 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 13px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th { text-align: left; padding: 8px 10px; background: #f1f5f9; font-size: 11px; text-transform: uppercase; color: #475569; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .totals { margin-top: 15px; border-top: 2px solid #e2e8f0; padding-top: 10px; text-align: right; font-size: 13px; }
          .total-line { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 5px; }
          .grand-total { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 8px; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
          @media print { body { margin: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">🏥 CENTRO MÉDICO NACIONAL</div>
            <div class="sub">Unidad Hospitalaria de Alta Especialidad • RFC: CMN-240210-9A1</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">RECIBO DE CAJA</span>
            <div class="sub" style="margin-top: 6px;">Folio Fiscal: <strong>${folio}</strong></div>
          </div>
        </div>

        <div class="section">
          <div class="grid">
            <div><strong>Paciente:</strong> ${patName}</div>
            <div><strong>Identificación / DNI:</strong> ${patDni}</div>
            <div><strong>Fecha de Emisión:</strong> ${dateStr}</div>
            <div><strong>Forma de Pago:</strong> ${metodo}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Concepto Clínico / Prestación</th>
              <th style="text-align: right;">Importe Bruto</th>
              <th style="text-align: right;">Descuento Cobertura</th>
              <th style="text-align: right;">Copago / Neto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${concepto}</strong></td>
              <td style="text-align: right;">$${bruto} MXN</td>
              <td style="text-align: right; color: #16a34a;">-$${desc} MXN</td>
              <td style="text-align: right; font-weight: bold;">$${neto} MXN</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="total-line"><span>Subtotal Arancelario:</span> <strong>$${bruto} MXN</strong></div>
          <div class="total-line" style="color: #16a34a;"><span>Bonificación Seguro / Obra Social:</span> <strong>-$${desc} MXN</strong></div>
          <div class="total-line grand-total"><span>Total Cobrado:</span> <strong>$${neto} MXN</strong></div>
        </div>

        <div class="footer">
          Comprobante emitido de acuerdo a la legislación fiscal vigente para servicios médicos y hospitalarios.<br>
          ¡Gracias por su confianza en Centro Médico Nacional!
        </div>

        <div class="no-print" style="margin-top: 25px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 24px; font-size: 14px; font-weight: bold; background: #d97706; color: white; border: none; border-radius: 8px; cursor: pointer;">
            🖨️ Imprimir Recibo Fiscal
          </button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
