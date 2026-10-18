import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments.component.html',
})
export class AppointmentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStateService);

  readonly appointments = signal<any[]>([]);
  readonly doctors = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly specialties = signal<any[]>([]);
  readonly offices = signal<any[]>([]);
  readonly showModal = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  selectedDoctorId: number = 0;
  selectedDate: string = '';

  newApp: any = {
    idPaciente: 1,
    idMedico: 2,
    idEspecialidad: 2,
    idConsultorio: 3,
    inicio: '',
    fin: '',
    motivoConsulta: '',
  };

  constructor() {
    effect(() => {
      // Reacciona automáticamente si se conmuta entre Recepción y Paciente Juan Pérez
      const user = this.auth.currentUser();
      this.loadAppointments();
    });
  }

  ngOnInit(): void {
    this.loadAppointments();
    this.loadCatalogs();
    if (this.route.snapshot.queryParams['openModal'] === 'true') {
      setTimeout(() => this.openModal(), 100);
    }
  }

  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(6);
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(1);

  loadAppointments(): void {
    const docId = this.selectedDoctorId > 0 ? this.selectedDoctorId : undefined;
    const date = this.selectedDate || undefined;
    const page = this.auth.isBasicUser() ? undefined : this.currentPage();
    const limit = this.auth.isBasicUser() ? undefined : this.pageSize();

    this.api.getAppointments(docId, date, page, limit).subscribe({
      next: (res) => {
        if (this.auth.isBasicUser()) {
          const raw = Array.isArray(res) ? res : (res.data || []);
          const user = this.auth.currentUser();
          const targetId = user.patientId || 1;
          const targetDni = user.dni || '28456123';
          const filtered = raw.filter((item: any) => {
            const pId = item.idPaciente || item.paciente?.idPaciente;
            const pDni = item.paciente?.dni;
            return pId === targetId || pDni === targetDni;
          });
          this.appointments.set(filtered);
          this.totalItems.set(filtered.length);
          this.totalPages.set(1);
        } else {
          if (Array.isArray(res)) {
            this.appointments.set(res);
            this.totalItems.set(res.length);
            this.totalPages.set(Math.max(1, Math.ceil(res.length / this.pageSize())));
          } else {
            this.appointments.set(res.data || []);
            this.totalItems.set(res.total || 0);
            this.totalPages.set(res.totalPages || 1);
            this.currentPage.set(res.page || 1);
          }
        }
      },
      error: (err) => console.error('Error al cargar citas médicas:', err),
    });
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadAppointments();
    }
  }

  loadCatalogs(): void {
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
    this.api.getPatients().subscribe((p) => this.patients.set(p));
    this.api.getSpecialties().subscribe((s) => this.specialties.set(s));
    this.api.getOffices().subscribe((o) => this.offices.set(o));
  }

  resetFilters(): void {
    this.selectedDoctorId = 0;
    this.selectedDate = '';
    this.currentPage.set(1);
    this.loadAppointments();
  }


  changeStatus(id: number, status: string): void {
    this.api.updateAppointmentStatus(id, status).subscribe({
      next: () => {
        this.loadAppointments();
        this.toast.success(`Cita médica actualizada a: "${status.toUpperCase()}"`);
      },
      error: (err) => {
        this.toast.error('Error al actualizar estatus de cita: ' + (err.error?.message || err.message));
      },
    });
  }

  cancelMyAppointment(id: number): void {
    if (confirm('¿Desea solicitar la cancelación de esta cita médica programada?')) {
      this.api.updateAppointmentStatus(id, 'cancelado').subscribe({
        next: () => {
          this.loadAppointments();
          this.toast.info('La cita médica ha sido cancelada correctamente.');
        },
        error: (err) => {
          this.toast.error('No se pudo cancelar la cita: ' + (err.error?.message || err.message));
        },
      });
    }
  }

  openModal(): void {
    this.errorMessage.set(null);
    if (this.auth.isBasicUser()) {
      this.newApp.idPaciente = this.auth.currentUser().patientId || 1;
    }

    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const end = new Date(now.getTime() + 30 * 60000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const toInputFormat = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    this.newApp.inicio = toInputFormat(now);
    this.newApp.fin = toInputFormat(end);
    this.showModal.set(true);
  }

  onInicioChange(): void {
    if (this.newApp.inicio) {
      const start = new Date(this.newApp.inicio);
      const end = new Date(start.getTime() + 30 * 60000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      this.newApp.fin = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    }
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitAppointment(event: Event): void {
    event.preventDefault();
    this.errorMessage.set(null);

    if (this.auth.isBasicUser()) {
      this.newApp.idPaciente = this.auth.currentUser().patientId || 1;
    }

    const payload = {
      ...this.newApp,
      inicio: new Date(this.newApp.inicio).toISOString(),
      fin: new Date(this.newApp.fin).toISOString(),
    };

    this.api.createAppointment(payload).subscribe({
      next: () => {
        this.closeModal();
        this.loadAppointments();
        this.toast.success(
          this.auth.isBasicUser()
            ? 'Tu cita médica fue solicitada exitosamente.'
            : 'Cita médica registrada en agenda hospitalaria.'
        );
      },
      error: (err) => {
        const msg = err.error?.message ||
          'Conflicto de horario: El médico ya tiene una consulta agendada en ese rango o consultorio ocupado.';
        this.errorMessage.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
