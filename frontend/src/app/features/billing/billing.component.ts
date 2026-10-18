import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
      },
      error: (err) => alert(err.error?.message || 'Error al emitir comprobante'),
    });
  }
}
