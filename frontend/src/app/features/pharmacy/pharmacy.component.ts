import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Medicamento, PharmacySummary } from '../../core/services/api.service';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy.component.html',
})
export class PharmacyComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthStateService);

  readonly medicamentos = signal<Medicamento[]>([]);
  readonly summary = signal<PharmacySummary | null>(null);
  readonly isLoading = signal<boolean>(false);

  // Reactive Pagination
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(6);

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.medicamentos().length / this.pageSize()));
  });

  readonly pagedMedicamentos = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.medicamentos().slice(start, start + this.pageSize());
  });

  readonly startIndex = computed(() => {
    return this.medicamentos().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.medicamentos().length);
  });

  searchTerm = '';
  selectedCategory = '';
  selectedAlert = '';

  readonly categories = [
    'Analgésicos y Antipiréticos',
    'Analgésicos Controlados UCI',
    'Antibióticos y Antimicrobianos',
    'Cardiología y Antihipertensivos',
    'Endocrinología y Diabetes',
    'Hematología y Anticoagulantes',
    'Neumología y Vías Respiratorias',
    'Urgencias y Soporte Vital',
    'Soluciones y Terapia IV',
  ];

  readonly categoryLabels: Record<string, string> = {
    'Analgésicos y Antipiréticos': 'Analgesics & Antipyretics',
    'Analgésicos Controlados UCI': 'ICU Controlled Analgesics',
    'Antibióticos y Antimicrobianos': 'Antibiotics & Antimicrobials',
    'Cardiología y Antihipertensivos': 'Cardiology & Antihypertensives',
    'Endocrinología y Diabetes': 'Endocrinology & Diabetes',
    'Hematología y Anticoagulantes': 'Hematology & Anticoagulants',
    'Neumología y Vías Respiratorias': 'Pulmonology & Respiratory',
    'Urgencias y Soporte Vital': 'Emergency & Life Support',
    'Soluciones y Terapia IV': 'IV Solutions & Therapy',
  };

  ngOnInit(): void {
    this.loadSummary();
    this.loadMedicamentos();
  }

  loadSummary(): void {
    this.api.getPharmacySummary().subscribe({
      next: (data) => this.summary.set(data),
      error: (err) => console.error('Error loading pharmacy summary:', err),
    });
  }

  loadMedicamentos(): void {
    this.isLoading.set(true);
    this.api
      .getMedicamentos(this.searchTerm, this.selectedCategory, this.selectedAlert)
      .subscribe({
        next: (data) => {
          this.medicamentos.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading medications:', err);
          this.isLoading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadMedicamentos();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedAlert = '';
    this.currentPage.set(1);
    this.loadMedicamentos();
  }

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

  getStockPercentage(m: Medicamento): number {
    if (!m.stockMaximo || m.stockMaximo <= 0) return 0;
    return Math.min(100, Math.round((m.stockActual / m.stockMaximo) * 100));
  }

  getAlertBadgeClass(alerta: string): string {
    switch (alerta?.toLowerCase()) {
      case 'crítico':
      case 'critico':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'bajo':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  }

  getProgressBarColor(alerta: string): string {
    switch (alerta?.toLowerCase()) {
      case 'crítico':
      case 'critico':
        return 'bg-rose-500';
      case 'bajo':
        return 'bg-amber-500';
      default:
        return 'bg-emerald-500';
    }
  }
}
