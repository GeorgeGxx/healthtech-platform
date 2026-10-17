import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing.component.html',
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
      },
      error: (err) => alert(err.error?.message || 'Error al emitir comprobante'),
    });
  }
}
