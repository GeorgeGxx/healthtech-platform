import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, ClinicalServiceTariff } from '../../core/services/api.service';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  selector: 'app-tariffs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tariffs.component.html',
})
export class TariffsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);

  readonly tariffs = signal<ClinicalServiceTariff[]>([]);
  readonly insurances = signal<any[]>([]);
  readonly selectedCategory = signal<string>('todos');
  readonly searchQuery = signal<string>('');

  // Simulador interactivo de copago
  readonly simServiceId = signal<string>('srv-card-02');
  readonly simInsuranceId = signal<number>(1); // OSDE 310 por defecto

  // Lista filtrada reactiva
  readonly filteredTariffs = computed(() => {
    const list = this.tariffs();
    const cat = this.selectedCategory();
    const q = this.searchQuery().trim().toLowerCase();

    return list.filter((item) => {
      const matchCat = cat === 'todos' || item.categoria === cat;
      const matchQuery =
        !q ||
        item.nombre.toLowerCase().includes(q) ||
        item.descripcion.toLowerCase().includes(q) ||
        item.categoriaNombre.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  });

  // Cálculos del simulador de copago
  readonly selectedSimService = computed(() => {
    return this.tariffs().find((t) => t.id === this.simServiceId()) || this.tariffs()[0];
  });

  readonly selectedSimInsurance = computed(() => {
    return (
      this.insurances().find((i) => i.idObraSocial === this.simInsuranceId()) ||
      this.insurances()[0] || {
        nombre: 'Particular / Sin Cobertura',
        porcentajeCobertura: 0,
      }
    );
  });

  readonly calculation = computed(() => {
    const srv = this.selectedSimService();
    const ins = this.selectedSimInsurance();

    if (!srv) {
      return { base: 0, discount: 0, copay: 0, percent: 0 };
    }

    const base = srv.precioBase;
    const percent = ins?.porcentajeCobertura ?? 0;
    const discount = Math.round((base * percent) / 100);
    const copay = Math.max(0, base - discount);

    return { base, discount, copay, percent };
  });

  ngOnInit(): void {
    this.api.getHospitalTariffs().subscribe((data) => {
      this.tariffs.set(data);
    });

    this.api.getInsurances().subscribe((ins) => {
      this.insurances.set(ins);
    });
  }

  setCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  selectForSimulation(serviceId: string): void {
    this.simServiceId.set(serviceId);
    // Scroll suave hacia el simulador
    const el = document.getElementById('simulador-aranceles');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  bookService(service: ClinicalServiceTariff): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/appointments']);
    } else {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/appointments', service: service.nombre },
      });
    }
  }
}
