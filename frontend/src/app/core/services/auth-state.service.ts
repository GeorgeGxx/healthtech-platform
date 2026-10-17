import { Injectable, signal, computed } from '@angular/core';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin_user' | 'basic_user';
  roles: string[];
  patientId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  // Estado reactivo del usuario con Signals de Angular 21
  readonly currentUser = signal<AppUser>({
    id: 'usr-admin-01',
    username: 'admin_user',
    name: 'Dr. Rafael Castelo (Administrador)',
    email: 'admin_user@centromedico.mx',
    role: 'admin_user',
    roles: ['admin_user', 'doctor_user'],
  });

  // Computed signals
  readonly isAdmin = computed(() => this.currentUser().role === 'admin_user');
  readonly isBasicUser = computed(() => this.currentUser().role === 'basic_user');

  switchToAdmin(): void {
    this.currentUser.set({
      id: 'usr-admin-01',
      username: 'admin_user',
      name: 'Dr. Rafael Castelo (Administrador)',
      email: 'admin_user@centromedico.mx',
      role: 'admin_user',
      roles: ['admin_user', 'doctor_user'],
    });
  }

  switchToBasicUser(): void {
    this.currentUser.set({
      id: 'usr-basic-01',
      username: 'basic_user',
      name: 'Juan Pérez García (Paciente)',
      email: 'basic_user@centromedico.mx',
      role: 'basic_user',
      roles: ['basic_user'],
      patientId: 1,
    });
  }
}
