import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, DashboardMetrics } from '../../core/services/api.service';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly auth = inject(AuthStateService);

  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly lastUpdated = signal<Date>(new Date());

  ngOnInit(): void {
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.isLoading.set(true);
    this.api.getDashboardMetrics().subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.isLoading.set(false);
        this.lastUpdated.set(new Date());
      },
      error: (err) => {
        console.error('Error al sincronizar dashboard:', err);
        this.isLoading.set(false);
      },
    });
  }
}
