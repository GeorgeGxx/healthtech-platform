import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ClinicalModalComponent } from '../../shared/components/clinical-modal/clinical-modal.component';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, ClinicalModalComponent],
  templateUrl: './billing.component.html',
})
export class BillingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly payments = signal<any[]>([]);
  readonly summary = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly concepts = signal<any[]>([]);
  readonly doctors = signal<any[]>([]);
  readonly appointments = signal<any[]>([]);
  readonly showModal = signal<boolean>(false);
  readonly activeTab = signal<'collections' | 'doctorFees'>('doctorFees');
  readonly selectedSettlement = signal<any | null>(null);
  readonly showSettlementModal = signal<boolean>(false);
  readonly isLoadingSettlement = signal<boolean>(false);

  readonly feePerConsultation = 1200;

  readonly doctorHonorariumBalances = computed(() => {
    const docs = this.doctors();
    const apps = this.appointments();

    return docs.map((doc) => {
      const docApps = apps.filter((a) => (a.idMedico || a.medico?.idMedico) === doc.idMedico);
      const attended = docApps.filter((a) => a.estado === 'atendido');
      const pending = docApps.filter((a) => a.estado === 'pendiente' || a.estado === 'confirmado');
      const canceled = docApps.filter((a) => a.estado === 'cancelado');

      const amountToPay = attended.length * this.feePerConsultation;
      const amountProjected = pending.length * this.feePerConsultation;

      return {
        idMedico: doc.idMedico,
        nombre: doc.nombre,
        apellido: doc.apellido,
        matricula: doc.matricula,
        especialidad: doc.especialidad || 'Specialist',
        attendedCount: attended.length,
        pendingCount: pending.length,
        canceledCount: canceled.length,
        totalApps: docApps.length,
        amountToPay,
        amountProjected,
        status: amountToPay > 0 ? 'Pending Settlement' : 'Up to Date',
      };
    });
  });

  readonly honorariumTotals = computed(() => {
    const balances = this.doctorHonorariumBalances();
    const totalToPay = balances.reduce((sum, b) => sum + b.amountToPay, 0);
    const totalProjected = balances.reduce((sum, b) => sum + b.amountProjected, 0);
    const totalAttendedCount = balances.reduce((sum, b) => sum + b.attendedCount, 0);
    const totalCanceledCount = balances.reduce((sum, b) => sum + b.canceledCount, 0);

    return {
      totalToPay,
      totalProjected,
      totalAttendedCount,
      totalCanceledCount,
      totalDoctors: balances.filter((b) => b.totalApps > 0).length || balances.length,
    };
  });

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
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
    this.api.getAppointments().subscribe((res: any) => {
      const data = Array.isArray(res) ? res : (res.data || []);
      this.appointments.set(data);
    });
  }

  loadData(): void {
    this.api.getPayments().subscribe((p) => this.payments.set(p));
    this.api.getBillingSummary().subscribe((s) => this.summary.set(s));
  }

  settleDoctorFee(doc: any): void {
    this.toast.success(`Settlement of $${doc.amountToPay.toLocaleString('en-US')} USD for Dr. ${doc.nombre} ${doc.apellido} registered successfully.`);
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
        this.toast.success('Tax receipt and payment registered successfully.');
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Error issuing payment receipt.');
      },
    });
  }

  printReceipt(p: any): void {
    const patName = p.paciente ? `${p.paciente.nombre} ${p.paciente.apellido}` : 'General Public';
    const patDni = p.paciente?.dni || 'N/A';
    const folio = p.comprobanteFiscal || `REC-${p.idPago}`;
    const dateStr = new Date(p.fechaPago || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const concepto = p.concepto?.nombre || 'Consultation / Hospital Service';
    const bruto = Number(p.montoBruto || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const desc = Number(p.descuentoCobertura || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const neto = Number(p.montoNeto || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const metodo = (p.metodoPago || 'efectivo').replace('_', ' ').toUpperCase();

    const printWindow = window.open('', '_blank', 'width=750,height=850');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Hospital Payment Receipt - Invoice ${folio}</title>
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
            <div class="logo">🏥 NATIONAL MEDICAL CENTER</div>
            <div class="sub">High-Specialty Hospital Unit • Tax ID: CMN-240210-9A1</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">CASHIER RECEIPT</span>
            <div class="sub" style="margin-top: 6px;">Invoice ID: <strong>${folio}</strong></div>
          </div>
        </div>

        <div class="section">
          <div class="grid">
            <div><strong>Patient:</strong> ${patName}</div>
            <div><strong>ID / DNI:</strong> ${patDni}</div>
            <div><strong>Issue Date:</strong> ${dateStr}</div>
            <div><strong>Payment Method:</strong> ${metodo}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Clinical Concept / Service</th>
              <th style="text-align: right;">Gross Amount</th>
              <th style="text-align: right;">Coverage Discount</th>
              <th style="text-align: right;">Copay / Net</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${concepto}</strong></td>
              <td style="text-align: right;">$${bruto} USD</td>
              <td style="text-align: right; color: #16a34a;">-$${desc} USD</td>
              <td style="text-align: right; font-weight: bold;">$${neto} USD</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="total-line"><span>Fee Subtotal:</span> <strong>$${bruto} USD</strong></div>
          <div class="total-line" style="color: #16a34a;"><span>Insurance Coverage Credit:</span> <strong>-$${desc} USD</strong></div>
          <div class="total-line grand-total"><span>Total Charged:</span> <strong>$${neto} USD</strong></div>
        </div>

        <div class="footer">
          Receipt issued in accordance with applicable tax regulations for medical and hospital services.<br>
          Thank you for trusting National Medical Center!
        </div>

        <div class="no-print" style="margin-top: 25px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 24px; font-size: 14px; font-weight: bold; background: #d97706; color: white; border: none; border-radius: 8px; cursor: pointer;">
            🖨️ Print Tax Receipt
          </button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  openDoctorSettlement(doctorId: number): void {
    this.isLoadingSettlement.set(true);
    this.api.getDoctorSettlement(doctorId).subscribe({
      next: (res) => {
        this.selectedSettlement.set(res);
        this.showSettlementModal.set(true);
        this.isLoadingSettlement.set(false);
      },
      error: (err) => {
        this.isLoadingSettlement.set(false);
        this.toast.error('Error calculating medical fee settlement: ' + (err.error?.message || err.message));
      },
    });
  }

  closeSettlementModal(): void {
    this.showSettlementModal.set(false);
    this.selectedSettlement.set(null);
  }
}
