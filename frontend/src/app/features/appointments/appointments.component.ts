import { Component, OnInit, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ToastService } from '../../core/services/toast.service';
import { ClinicalModalComponent } from '../../shared/components/clinical-modal/clinical-modal.component';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, ClinicalModalComponent],
  templateUrl: './appointments.component.html',
})
export class AppointmentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStateService);

  readonly appointments = signal<any[]>([]);
  readonly doctors = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly specialties = signal<any[]>([]);
  readonly offices = signal<any[]>([]);
  readonly showModal = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly feePerConsultation = 1200;
  readonly selectedDoctorDay = signal<string>('2026-10-18');

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

  getInitials(nombre?: string, apellido?: string): string {
    const p1 = (nombre || '').trim()[0] || '';
    const p2 = (apellido || '').trim()[0] || '';
    return (p1 + p2).toUpperCase() || 'P';
  }

  getAvatarColor(name?: string): string {
    const colors = [
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-sky-100 text-sky-700 border-sky-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-rose-100 text-rose-700 border-rose-200',
    ];
    let hash = 0;
    const str = name || 'paciente';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  private sortAppointmentsDesc(list: any[]): any[] {
    return [...list].sort((a, b) => {
      const timeA = new Date(a.fechaInicio || a.horarioRango || 0).getTime();
      const timeB = new Date(b.fechaInicio || b.horarioRango || 0).getTime();
      return timeB - timeA;
    });
  }

  getDateKey(fecha?: string): string {
    if (!fecha) return 'Sin fecha';
    const match = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : fecha.slice(0, 10);
  }

  selectDoctorDay(day: string): void {
    this.selectedDoctorDay.set(day);
  }

  formatDateLabel(dateKey: string): string {
    const cleanKey = this.getDateKey(dateKey);
    if (!cleanKey || cleanKey === 'Sin fecha') return 'Sin fecha';
    const parts = cleanKey.split('-');
    if (parts.length < 3) return cleanKey;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthName = months[(month || 1) - 1];
    if (cleanKey === '2026-10-18') {
      return `Día 18 de ${monthName} (Hoy)`;
    } else if (cleanKey === '2026-10-17') {
      return `Día 17 de ${monthName} (Ayer)`;
    }
    return `Día ${day} de ${monthName}, ${year}`;
  }

  readonly doctorAppointments = computed(() => {
    const list = this.appointments();
    if (this.auth.isDoctor()) {
      const docId = this.auth.currentUser().doctorId || 2;
      return this.sortAppointmentsDesc(list.filter((a) => (a.idMedico || a.medico?.idMedico) === docId));
    }
    return this.sortAppointmentsDesc(list);
  });

  readonly doctorDaysList = computed(() => {
    const apps = this.doctorAppointments();
    const map = new Map<string, any>();

    for (const app of apps) {
      const dateKey = this.getDateKey(app.fechaInicio);
      if (!map.has(dateKey)) {
        const dayNumber = dateKey.split('-')[2] || '';
        const dayLabel = dateKey === '2026-10-18' ? 'Hoy (Día 18)' : (dateKey === '2026-10-17' ? 'Ayer (Día 17)' : `Día ${dayNumber}`);
        map.set(dateKey, {
          dateKey,
          dayNumber,
          dayLabel,
          formattedDate: this.formatDateLabel(dateKey),
          totalPatients: 0,
          attendedCount: 0,
          canceledCount: 0,
          pendingCount: 0,
          confirmedPayout: 0,
          projectedPayout: 0,
          totalPotential: 0,
          attendanceRate: 0,
          apps: [],
        });
      }
      const day = map.get(dateKey);
      day.totalPatients++;
      day.apps.push(app);
      if (app.estado === 'atendido') {
        day.attendedCount++;
      } else if (app.estado === 'cancelado') {
        day.canceledCount++;
      } else {
        day.pendingCount++;
      }
    }

    const list = Array.from(map.values()).map((d) => {
      d.confirmedPayout = d.attendedCount * this.feePerConsultation;
      d.projectedPayout = (d.attendedCount + d.pendingCount) * this.feePerConsultation;
      d.totalPotential = d.totalPatients * this.feePerConsultation;
      d.attendanceRate = d.totalPatients > 0 ? Math.round((d.attendedCount / d.totalPatients) * 100) : 0;
      return d;
    });

    return list.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  });

  readonly activeDoctorDaySummary = computed(() => {
    const selected = this.selectedDoctorDay();
    const days = this.doctorDaysList();

    if (selected !== 'all') {
      const day = days.find((d) => d.dateKey === selected);
      if (day) {
        return {
          isSingleDay: true,
          dateKey: day.dateKey,
          formattedDate: day.formattedDate,
          feePerConsultation: this.feePerConsultation,
          totalPatients: day.totalPatients,
          attendedCount: day.attendedCount,
          canceledCount: day.canceledCount,
          pendingCount: day.pendingCount,
          confirmedPayout: day.confirmedPayout,
          projectedPayout: day.projectedPayout,
          totalPotential: day.totalPotential,
          attendanceRate: day.attendanceRate,
          forfeitedByCancellation: day.canceledCount * this.feePerConsultation,
        };
      }
    }

    // Todas las jornadas sumadas
    const totalPatients = days.reduce((sum, d) => sum + d.totalPatients, 0);
    const attendedCount = days.reduce((sum, d) => sum + d.attendedCount, 0);
    const canceledCount = days.reduce((sum, d) => sum + d.canceledCount, 0);
    const pendingCount = days.reduce((sum, d) => sum + d.pendingCount, 0);
    const confirmedPayout = attendedCount * this.feePerConsultation;
    const projectedPayout = (attendedCount + pendingCount) * this.feePerConsultation;
    const totalPotential = totalPatients * this.feePerConsultation;
    const attendanceRate = totalPatients > 0 ? Math.round((attendedCount / totalPatients) * 100) : 0;

    return {
      isSingleDay: false,
      dateKey: 'all',
      formattedDate: 'Todas las Jornadas Médicas',
      feePerConsultation: this.feePerConsultation,
      totalPatients,
      attendedCount,
      canceledCount,
      pendingCount,
      confirmedPayout,
      projectedPayout,
      totalPotential,
      attendanceRate,
      forfeitedByCancellation: canceledCount * this.feePerConsultation,
    };
  });

  readonly doctorFinancialSummary = computed(() => this.activeDoctorDaySummary());

  readonly displayedAppointments = computed(() => {
    let list = this.appointments();
    if (this.auth.isDoctor()) {
      const docId = this.auth.currentUser().doctorId || 2;
      list = list.filter((a) => (a.idMedico || a.medico?.idMedico) === docId);
      const day = this.selectedDoctorDay();
      if (day !== 'all') {
        list = list.filter((a) => this.getDateKey(a.fechaInicio) === day);
      }
    }
    return this.sortAppointmentsDesc(list);
  });

  constructor() {
    effect(() => {
      // Reacciona automáticamente si se conmuta entre Recepción, Médico o Paciente
      const user = this.auth.currentUser();
      if (this.auth.isDoctor() && user.doctorId) {
        this.selectedDoctorId = user.doctorId;
      }
      this.loadAppointments();
    });
  }

  ngOnInit(): void {
    this.loadAppointments();
    this.loadCatalogs();

    const shouldOpenModal =
      history.state?.openModal ||
      this.route.snapshot.queryParams['openModal'] === 'true';

    if (shouldOpenModal) {
      setTimeout(() => this.openModal(), 100);

      // Si se navega o redirige con parámetro queryParam, limpiar de inmediato la URL para mantenerla 100% limpia
      if (this.route.snapshot.queryParams['openModal']) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { openModal: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    }
  }

  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(6);
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(1);

  loadAppointments(): void {
    const docId = this.selectedDoctorId > 0 ? this.selectedDoctorId : undefined;
    const date = this.selectedDate || undefined;
    const isPagingDisabled = this.auth.isBasicUser() || this.auth.isDoctor();
    const page = isPagingDisabled ? undefined : this.currentPage();
    const limit = isPagingDisabled ? undefined : this.pageSize();

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
          const sorted = this.sortAppointmentsDesc(filtered);
          this.appointments.set(sorted);
          this.totalItems.set(sorted.length);
          this.totalPages.set(1);
        } else if (this.auth.isDoctor()) {
          const raw = Array.isArray(res) ? res : (res.data || []);
          const sorted = this.sortAppointmentsDesc(raw);
          this.appointments.set(sorted);
          this.totalItems.set(sorted.length);
          this.totalPages.set(1);
        } else {
          if (Array.isArray(res)) {
            const sorted = this.sortAppointmentsDesc(res);
            this.appointments.set(sorted);
            this.totalItems.set(sorted.length);
            this.totalPages.set(Math.max(1, Math.ceil(sorted.length / this.pageSize())));
          } else {
            const sorted = this.sortAppointmentsDesc(res.data || []);
            this.appointments.set(sorted);
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
