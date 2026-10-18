import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin_user' | 'basic_user' | 'doctor_user' | 'guest';
  roleTitle: string;
  roles: string[];
  patientId?: number;
  doctorId?: number;
  license?: string;
  specialty?: string;
  dni?: string;
  insurance?: string;
}

export const GUEST_USER: AppUser = {
  id: 'guest',
  username: 'guest',
  name: 'Visitante del Centro Médico',
  email: '',
  role: 'guest',
  roleTitle: 'Visitante (No autenticado)',
  roles: [],
};

export const ADMIN_USER: AppUser = {
  id: 'usr-recep-01',
  username: 'admin_user',
  name: 'Lic. Sofía Ramos',
  email: 'recepcion@centromedico.mx',
  role: 'admin_user',
  roleTitle: 'Recepción y Coordinación Médica',
  roles: ['admin_user', 'receptionist_user'],
};

export const DOCTOR_USER: AppUser = {
  id: 'usr-doc-02',
  username: 'doctor_user',
  name: 'Dra. Laura Gómez',
  email: 'laura.gomez@centromedico.mx',
  role: 'doctor_user',
  roleTitle: 'Médico Tratante Especialista',
  roles: ['doctor_user'],
  doctorId: 2,
  license: 'MN-10002',
  specialty: 'Dermatología',
};

export const BASIC_USER: AppUser = {
  id: 'usr-patient-01',
  username: 'basic_user',
  name: 'Juan Pérez García',
  email: 'juan.perez@email.com',
  role: 'basic_user',
  roleTitle: 'Paciente Titular',
  roles: ['basic_user'],
  patientId: 1,
  dni: '28456123',
  insurance: 'GNP Seguros (Póliza 88992)',
};

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private readonly router = inject(Router);

  // Inicializa con usuario recordado o por defecto Recepción para facilidad de demo
  readonly currentUser = signal<AppUser>(this.loadInitialUser());

  // Señales calculadas
  readonly isAdmin = computed(() => this.currentUser().role === 'admin_user');
  readonly isDoctor = computed(() => this.currentUser().role === 'doctor_user');
  readonly isBasicUser = computed(() => this.currentUser().role === 'basic_user');
  readonly isGuest = computed(() => this.currentUser().role === 'guest');
  readonly isAuthenticated = computed(() => this.currentUser().role !== 'guest');
  readonly canManageRecords = computed(
    () => this.currentUser().role === 'admin_user' || this.currentUser().role === 'doctor_user',
  );

  login(username: string, password: string): { success: boolean; message?: string } {
    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();

    // Credenciales para Recepción / admin_user
    if (
      (u === 'admin_user' || u === 'admin' || u === 'recepcion' || u === 'sofia' || u === 'recepcion@centromedico.mx') &&
      (p === 'admin' || p === 'Admin123!' || p === 'admin123')
    ) {
      this.setUser(ADMIN_USER);
      return { success: true };
    }

    // Credenciales para Médico Tratante / doctor_user (Dra. Laura Gómez)
    if (
      (u === 'doctor_user' || u === 'doctor' || u === 'medico' || u === 'laura' || u === 'laura.gomez' || u === 'dr.gomez' || u === 'laura.gomez@centromedico.mx') &&
      (p === 'doctor' || p === 'Doctor123!' || p === 'admin' || p === 'doctor123')
    ) {
      this.setUser(DOCTOR_USER);
      return { success: true };
    }

    // Credenciales para Paciente / basic_user (Juan Pérez García)
    if (
      (u === 'basic_user' || u === 'user' || u === 'paciente' || u === 'juan' || u === 'juan.perez' || u === 'juan.perez@email.com') &&
      (p === 'user' || p === 'User123!' || p === 'admin' || p === 'user123')
    ) {
      this.setUser(BASIC_USER);
      return { success: true };
    }

    return {
      success: false,
      message: 'Credenciales inválidas. Puede ingresar con doctor_user / Doctor123!, admin_user / Admin123! o basic_user / User123!.',
    };
  }

  logout(): void {
    this.setUser(GUEST_USER);
    this.router.navigate(['/']);
  }

  switchToAdmin(): void {
    this.setUser(ADMIN_USER);
    this.router.navigate(['/dashboard']);
  }

  switchToDoctor(): void {
    this.setUser(DOCTOR_USER);
    this.router.navigate(['/medical-records']);
  }

  switchToBasicUser(): void {
    this.setUser(BASIC_USER);
    this.router.navigate(['/dashboard']);
  }

  switchToGuest(): void {
    this.setUser(GUEST_USER);
    this.router.navigate(['/']);
  }

  private setUser(user: AppUser): void {
    this.currentUser.set(user);
    try {
      localStorage.setItem('healthtech_user_role', user.role);
    } catch {}
  }

  private loadInitialUser(): AppUser {
    try {
      const savedRole = localStorage.getItem('healthtech_user_role');
      if (savedRole === 'doctor_user') return DOCTOR_USER;
      if (savedRole === 'basic_user') return BASIC_USER;
      if (savedRole === 'guest') return GUEST_USER;
      if (savedRole === 'admin_user') return ADMIN_USER;
      return ADMIN_USER;
    } catch {
      return ADMIN_USER;
    }
  }
}
