import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments.component.html',
})
export class AppointmentsComponent implements OnInit {
  private readonly api = inject(ApiService);

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

  ngOnInit(): void {
    this.loadAppointments();
    this.loadCatalogs();
  }

  loadAppointments(): void {
    const docId = this.selectedDoctorId > 0 ? this.selectedDoctorId : undefined;
    const date = this.selectedDate || undefined;
    this.api.getAppointments(docId, date).subscribe({
      next: (data) => this.appointments.set(data),
      error: (err) => console.error('Error al cargar citas médicas:', err),
    });
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
    this.loadAppointments();
  }

  changeStatus(id: number, status: string): void {
    this.api.updateAppointmentStatus(id, status).subscribe({
      next: () => this.loadAppointments(),
      error: (err) => alert('Error al actualizar estatus de cita: ' + err.message),
    });
  }

  openModal(): void {
    this.errorMessage.set(null);
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

  closeModal(): void {
    this.showModal.set(false);
  }

  submitAppointment(event: Event): void {
    event.preventDefault();
    this.errorMessage.set(null);

    const payload = {
      ...this.newApp,
      inicio: new Date(this.newApp.inicio).toISOString(),
      fin: new Date(this.newApp.fin).toISOString(),
    };

    this.api.createAppointment(payload).subscribe({
      next: () => {
        this.closeModal();
        this.loadAppointments();
      },
      error: (err) => {
        this.errorMessage.set(
          err.error?.message ||
            'Conflicto de horario: El médico ya tiene una consulta agendada en ese rango.',
        );
      },
    });
  }
}
