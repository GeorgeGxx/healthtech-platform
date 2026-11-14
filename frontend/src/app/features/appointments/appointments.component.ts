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
  readonly virtualRoomData = signal<any | null>(null);
  readonly showVirtualRoomModal = signal<boolean>(false);
  readonly isGeneratingRoom = signal<boolean>(false);

  readonly feePerConsultation = 1200;
  readonly selectedDoctorDay = signal<string>('2026-10-18');
  readonly calendarYear = signal<number>(2026);
  readonly calendarMonth = signal<number>(10); // 1 = January, 10 = October

  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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

  prevMonth(): void {
    if (this.calendarMonth() === 1) {
      this.calendarMonth.set(12);
      this.calendarYear.update((y) => y - 1);
    } else {
      this.calendarMonth.update((m) => m - 1);
    }
  }

  nextMonth(): void {
    if (this.calendarMonth() === 12) {
      this.calendarMonth.set(1);
      this.calendarYear.update((y) => y + 1);
    } else {
      this.calendarMonth.update((m) => m + 1);
    }
  }

  goToToday(): void {
    this.calendarYear.set(2026);
    this.calendarMonth.set(10);
    this.selectedDoctorDay.set('2026-10-18');
  }

  selectDoctorDay(day: string): void {
    this.selectedDoctorDay.set(day);
  }

  selectFullMonth(): void {
    this.selectedDoctorDay.set('month');
  }

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
    const str = name || 'patient';
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
    if (!fecha) return 'No date';
    const match = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : fecha.slice(0, 10);
  }

  formatDateLabel(dateKey: string): string {
    const cleanKey = this.getDateKey(dateKey);
    if (!cleanKey || cleanKey === 'No date') return 'No date';
    const parts = cleanKey.split('-');
    if (parts.length < 3) return cleanKey;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const monthName = this.monthNames[(month || 1) - 1];
    if (cleanKey === '2026-10-18') {
      return `${monthName} 18 (Today)`;
    } else if (cleanKey === '2026-10-17') {
      return `${monthName} 17 (Yesterday)`;
    }
    return `${monthName} ${day}, ${year}`;
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
        const dayLabel = dateKey === '2026-10-18' ? 'Today (Day 18)' : (dateKey === '2026-10-17' ? 'Yesterday (Day 17)' : `Day ${dayNumber}`);
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

  // Minimalist monthly calendar with active days only when patients are scheduled
  readonly calendarDays = computed(() => {
    const year = this.calendarYear();
    const month = this.calendarMonth();
    const apps = this.doctorAppointments();
    const selected = this.selectedDoctorDay();

    // Statistics map by date
    const dayStats = new Map<string, { totalPatients: number; attendedCount: number; canceledCount: number; confirmedPayout: number }>();
    for (const app of apps) {
      const dateKey = this.getDateKey(app.fechaInicio);
      if (!dayStats.has(dateKey)) {
        dayStats.set(dateKey, { totalPatients: 0, attendedCount: 0, canceledCount: 0, confirmedPayout: 0 });
      }
      const st = dayStats.get(dateKey)!;
      st.totalPatients++;
      if (app.estado === 'atendido') {
        st.attendedCount++;
      } else if (app.estado === 'cancelado') {
        st.canceledCount++;
      }
      st.confirmedPayout = st.attendedCount * this.feePerConsultation;
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sunday, 1 = Monday
    const leadingOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Adjust for week starting on Monday

    const prevMonthDays = new Date(year, month - 1, 0).getDate();
    const cells: any[] = [];

    // Previous month days (inactive)
    for (let i = leadingOffset - 1; i >= 0; i--) {
      cells.push({
        dayNumber: prevMonthDays - i,
        isCurrentMonth: false,
        hasPatients: false,
        dateKey: '',
        totalPatients: 0,
        attendedCount: 0,
        canceledCount: 0,
        confirmedPayout: 0,
        isToday: false,
        isSelected: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const stats = dayStats.get(dateKey);
      const hasPatients = !!stats && stats.totalPatients > 0;
      const isToday = (dateKey === '2026-10-18');
      const isSelected = (selected === dateKey);

      cells.push({
        dayNumber: day,
        isCurrentMonth: true,
        hasPatients,
        dateKey,
        totalPatients: stats?.totalPatients || 0,
        attendedCount: stats?.attendedCount || 0,
        canceledCount: stats?.canceledCount || 0,
        confirmedPayout: stats?.confirmedPayout || 0,
        isToday,
        isSelected,
      });
    }

    // Next month days to complete the grid (multiple of 7)
    const remainder = cells.length % 7;
    if (remainder > 0) {
      const trailingCount = 7 - remainder;
      for (let day = 1; day <= trailingCount; day++) {
        cells.push({
          dayNumber: day,
          isCurrentMonth: false,
          hasPatients: false,
          dateKey: '',
          totalPatients: 0,
          attendedCount: 0,
          canceledCount: 0,
          confirmedPayout: 0,
          isToday: false,
          isSelected: false,
        });
      }
    }

    return cells;
  });

  // Full Month Summary
  readonly monthlySummary = computed(() => {
    const year = this.calendarYear();
    const month = this.calendarMonth();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const apps = this.doctorAppointments().filter((a) => this.getDateKey(a.fechaInicio).startsWith(prefix));

    const totalPatients = apps.length;
    let attendedCount = 0;
    let canceledCount = 0;
    let pendingCount = 0;

    for (const a of apps) {
      if (a.estado === 'atendido') attendedCount++;
      else if (a.estado === 'cancelado') canceledCount++;
      else pendingCount++;
    }

    const totalConfirmedPayout = attendedCount * this.feePerConsultation;
    const totalPotential = totalPatients * this.feePerConsultation;
    const totalLostByCancellation = canceledCount * this.feePerConsultation;
    const attendanceRate = totalPatients > 0 ? Math.round((attendedCount / totalPatients) * 100) : 0;

    return {
      year,
      month,
      monthName: `${this.monthNames[month - 1]} ${year}`,
      totalPatients,
      attendedCount,
      canceledCount,
      pendingCount,
      totalConfirmedPayout,
      totalPotential,
      totalLostByCancellation,
      attendanceRate,
    };
  });

  // Proportional correlation between the selected day and the monthly total
  readonly correlationSummary = computed(() => {
    const monthSum = this.monthlySummary();
    const selected = this.selectedDoctorDay();
    const days = this.doctorDaysList();

    if (selected !== 'all' && selected !== 'month') {
      const day = days.find((d) => d.dateKey === selected);
      if (day) {
        const payoutPercentage = monthSum.totalConfirmedPayout > 0
          ? Math.round((day.confirmedPayout / monthSum.totalConfirmedPayout) * 100)
          : 0;
        const patientPercentage = monthSum.totalPatients > 0
          ? Math.round((day.totalPatients / monthSum.totalPatients) * 100)
          : 0;

        return {
          isSingleDay: true,
          dateKey: day.dateKey,
          label: day.formattedDate,
          dayLabel: day.dayLabel,
          dayPatients: day.totalPatients,
          dayAttended: day.attendedCount,
          dayCanceled: day.canceledCount,
          dayPending: day.pendingCount,
          dayPayout: day.confirmedPayout,
          dayPotential: day.totalPotential,
          dayAttendanceRate: day.attendanceRate,
          payoutShareOfTotal: payoutPercentage,
          patientsShareOfTotal: patientPercentage,
          monthlyPayout: monthSum.totalConfirmedPayout,
          monthlyPatients: monthSum.totalPatients,
          monthlyAttended: monthSum.attendedCount,
          monthlyCanceled: monthSum.canceledCount,
          monthlyPotential: monthSum.totalPotential,
          monthlyAttendanceRate: monthSum.attendanceRate,
          forfeitedToday: day.canceledCount * this.feePerConsultation,
        };
      }
    }

    // Full Month Mode
    return {
      isSingleDay: false,
      dateKey: 'month',
      label: `Full Month (${monthSum.monthName})`,
      dayLabel: monthSum.monthName,
      dayPatients: monthSum.totalPatients,
      dayAttended: monthSum.attendedCount,
      dayCanceled: monthSum.canceledCount,
      dayPending: monthSum.pendingCount,
      dayPayout: monthSum.totalConfirmedPayout,
      dayPotential: monthSum.totalPotential,
      dayAttendanceRate: monthSum.attendanceRate,
      payoutShareOfTotal: 100,
      patientsShareOfTotal: 100,
      monthlyPayout: monthSum.totalConfirmedPayout,
      monthlyPatients: monthSum.totalPatients,
      monthlyAttended: monthSum.attendedCount,
      monthlyCanceled: monthSum.canceledCount,
      monthlyPotential: monthSum.totalPotential,
      monthlyAttendanceRate: monthSum.attendanceRate,
      forfeitedToday: monthSum.totalLostByCancellation,
    };
  });

  readonly activeDoctorDaySummary = computed(() => {
    const corr = this.correlationSummary();
    return {
      isSingleDay: corr.isSingleDay,
      dateKey: corr.dateKey,
      formattedDate: corr.label,
      feePerConsultation: this.feePerConsultation,
      totalPatients: corr.dayPatients,
      attendedCount: corr.dayAttended,
      canceledCount: corr.dayCanceled,
      pendingCount: corr.dayPending,
      confirmedPayout: corr.dayPayout,
      projectedPayout: (corr.dayAttended + corr.dayPending) * this.feePerConsultation,
      totalPotential: corr.dayPotential,
      attendanceRate: corr.dayAttendanceRate,
      forfeitedByCancellation: corr.forfeitedToday,
    };
  });

  readonly doctorFinancialSummary = computed(() => this.activeDoctorDaySummary());

  readonly displayedAppointments = computed(() => {
    let list = this.appointments();
    if (this.auth.isDoctor()) {
      const docId = this.auth.currentUser().doctorId || 2;
      list = list.filter((a) => (a.idMedico || a.medico?.idMedico) === docId);
      const day = this.selectedDoctorDay();
      if (day !== 'all' && day !== 'month') {
        list = list.filter((a) => this.getDateKey(a.fechaInicio) === day);
      } else {
        const y = this.calendarYear();
        const m = String(this.calendarMonth()).padStart(2, '0');
        const prefix = `${y}-${m}`;
        list = list.filter((a) => this.getDateKey(a.fechaInicio).startsWith(prefix));
      }
    }
    return this.sortAppointmentsDesc(list);
  });

  constructor() {
    effect(() => {
      // Automatically reacts when switching between Reception, Physician, or Patient
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

      // If navigated or redirected with queryParam, clear the URL immediately to keep it clean
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
      error: (err) => console.error('Error loading medical appointments:', err),
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
    const statusLabels: Record<string, string> = {
      atendido: 'ATTENDED',
      cancelado: 'CANCELLED',
      confirmado: 'CONFIRMED',
      pendiente: 'PENDING',
    };
    this.api.updateAppointmentStatus(id, status).subscribe({
      next: () => {
        this.loadAppointments();
        this.toast.success(`Appointment updated to: "${statusLabels[status] || status.toUpperCase()}"`);
      },
      error: (err) => {
        this.toast.error('Error updating appointment status: ' + (err.error?.message || err.message));
      },
    });
  }

  cancelMyAppointment(id: number): void {
    if (confirm('Would you like to request cancellation for this scheduled appointment?')) {
      this.api.updateAppointmentStatus(id, 'cancelado').subscribe({
        next: () => {
          this.loadAppointments();
          this.toast.info('Your medical appointment has been cancelled successfully.');
        },
        error: (err) => {
          this.toast.error('Could not cancel appointment: ' + (err.error?.message || err.message));
        },
      });
    }
  }

  startTelemedicine(appointment: any): void {
    const idTurno = appointment.idTurno || appointment.id;
    this.isGeneratingRoom.set(true);
    this.api.createVirtualRoom(idTurno).subscribe({
      next: (res) => {
        this.virtualRoomData.set({
          ...res,
          paciente: appointment.paciente?.nombre ? `${appointment.paciente.nombre} ${appointment.paciente.apellido}` : 'Patient',
          medico: appointment.medico?.nombre ? `Dr. ${appointment.medico.nombre} ${appointment.medico.apellido}` : 'Specialist Physician',
          especialidad: appointment.especialidad?.nombre || 'Medical Consultation',
        });
        this.showVirtualRoomModal.set(true);
        this.isGeneratingRoom.set(false);
        this.toast.success('WebRTC Telemedicine Room created successfully.');
      },
      error: (err) => {
        this.isGeneratingRoom.set(false);
        this.toast.error('Could not generate virtual room: ' + (err.error?.message || err.message));
      },
    });
  }

  closeVirtualRoomModal(): void {
    this.showVirtualRoomModal.set(false);
    this.virtualRoomData.set(null);
  }

  copyRoomUrl(url: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      this.toast.success('Telemedicine link copied to clipboard');
    }
  }

  sendAppointmentReminder(appointment: any): void {
    const idTurno = appointment.idTurno || appointment.id;
    const pacienteNombre = appointment.paciente?.nombre
      ? `${appointment.paciente.nombre} ${appointment.paciente.apellido}`
      : 'Patient';
    const medicoNombre = appointment.medico?.nombre
      ? `Dr. ${appointment.medico.nombre} ${appointment.medico.apellido}`
      : 'Attending Physician';
    const especialidad = appointment.especialidad?.nombre || 'General Medicine';

    this.api.triggerMultichannelReminder({
      idTurno,
      pacienteNombre,
      medicoNombre,
      especialidad,
    }).subscribe({
      next: (res) => {
        this.toast.success(`Automated reminders sent via WhatsApp and Email (${res.totalGenerados} notifications queued).`);
      },
      error: (err) => {
        this.toast.error('Error sending multichannel reminder: ' + (err.error?.message || err.message));
      },
    });
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
            ? 'Your medical appointment request was submitted successfully.'
            : 'Medical appointment registered in the hospital schedule.'
        );
      },
      error: (err) => {
        const msg = err.error?.message ||
          'Schedule conflict: The physician already has an appointment booked in that time slot or the room is occupied.';
        this.errorMessage.set(msg);
        this.toast.error(msg);
      },
    });
  }
}
