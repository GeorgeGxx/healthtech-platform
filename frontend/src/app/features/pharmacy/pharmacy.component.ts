import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Medicamento, PharmacySummary } from '../../core/services/api.service';

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy.component.html',
})
export class PharmacyComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly medicamentos = signal<Medicamento[]>([]);
  readonly summary = signal<PharmacySummary | null>(null);
  readonly isLoading = signal<boolean>(false);

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

  ngOnInit(): void {
    this.loadSummary();
    this.loadMedicamentos();
  }

  loadSummary(): void {
    this.api.getPharmacySummary().subscribe({
      next: (data) => this.summary.set(data),
      error: (err) => console.error('Error cargando resumen de farmacia:', err),
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
          console.error('Error cargando medicamentos:', err);
          this.isLoading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.loadMedicamentos();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedAlert = '';
    this.loadMedicamentos();
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
