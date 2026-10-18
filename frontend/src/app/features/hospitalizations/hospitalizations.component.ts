import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-hospitalizations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hospitalizations.component.html',
})
export class HospitalizationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly bedCensus = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly doctors = signal<any[]>([]);

  // Filtros reactivos de Censo Hospitalario
  readonly selectedFloor = signal<string>('todos');
  readonly selectedStatus = signal<string>('todos');

  readonly filteredBedCensus = computed(() => {
    const list = this.bedCensus();
    const floor = this.selectedFloor();
    const status = this.selectedStatus();

    return list.filter((bed) => {
      const matchFloor = floor === 'todos' || bed.piso?.toString() === floor;
      const matchStatus = status === 'todos' || bed.estado?.toLowerCase() === status.toLowerCase();
      return matchFloor && matchStatus;
    });
  });

  readonly showDischargeModal = signal<boolean>(false);
  readonly showAdmitModal = signal<boolean>(false);

  selectedStayId: number | null = null;
  dischargeReason: string = '';

  admitData: any = {
    idPaciente: 4,
    idMedicoResponsable: 2,
    idHabitacion: 1,
    diagnosticoIngreso: '',
  };

  ngOnInit(): void {
    this.loadCensus();
    this.api.getPatients().subscribe((p) => this.patients.set(p));
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
  }

  loadCensus(): void {
    this.api.getBedCensus().subscribe({
      next: (data) => this.bedCensus.set(data),
      error: (err) => console.error(err),
    });
  }

  openDischargeModal(stayId: number): void {
    this.selectedStayId = stayId;
    this.dischargeReason = 'Alta médica por resolución clínica satisfactoria';
    this.showDischargeModal.set(true);
  }

  closeDischargeModal(): void {
    this.showDischargeModal.set(false);
  }

  confirmDischarge(event: Event): void {
    event.preventDefault();
    if (!this.selectedStayId) return;

    this.api.dischargePatient(this.selectedStayId, this.dischargeReason).subscribe({
      next: () => {
        this.closeDischargeModal();
        this.loadCensus();
        this.toast.success('Alta médica procesada correctamente. Cama liberada para nuevo ingreso.');
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Error al conceder alta médica.');
      },
    });
  }

  openAdmitModal(): void {
    this.showAdmitModal.set(true);
  }

  quickAdmit(roomId: number): void {
    this.admitData.idHabitacion = roomId;
    this.showAdmitModal.set(true);
  }

  closeAdmitModal(): void {
    this.showAdmitModal.set(false);
  }

  confirmAdmit(event: Event): void {
    event.preventDefault();
    this.api.admitPatient(this.admitData).subscribe({
      next: () => {
        this.closeAdmitModal();
        this.loadCensus();
        this.toast.success('Ingreso hospitalario confirmado y cama asignada.');
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Error al admitir paciente.');
      },
    });
  }
}
