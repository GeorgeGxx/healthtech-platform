import { Injectable, signal, computed } from '@angular/core';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin_user' | 'basic_user';
  roleTitle: string;
  roles: string[];
  patientId?: number;
  dni?: string;
  insurance?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  // Estado reactivo del usuario con Signals de Angular 21
  // Por defecto: Recepción y Admisión Hospitalaria (admin_user)
  readonly currentUser = signal<AppUser>({
    id: 'usr-recep-01',
    username: 'admin_user',
    name: 'Lic. Sofía Ramos',
    email: 'recepcion@centromedico.mx',
    role: 'admin_user',
    roleTitle: 'Recepción y Coordinación Médica',
    roles: ['admin_user', 'receptionist_user'],
  });

  // Computed signals
  readonly isAdmin = computed(() => this.currentUser().role === 'admin_user');
  readonly isBasicUser = computed(() => this.currentUser().role === 'basic_user');

  switchToAdmin(): void {
    this.currentUser.set({
      id: 'usr-recep-01',
      username: 'admin_user',
      name: 'Lic. Sofía Ramos',
      email: 'recepcion@centromedico.mx',
      role: 'admin_user',
      roleTitle: 'Recepción y Coordinación Médica',
      roles: ['admin_user', 'receptionist_user'],
    });
  }

  switchToBasicUser(): void {
    this.currentUser.set({
      id: 'usr-patient-01',
      username: 'basic_user',
      name: 'Juan Pérez García',
      email: 'juan.perez@email.com',
      role: 'basic_user',
      roleTitle: 'Paciente',
      roles: ['basic_user'],
      patientId: 1,
      dni: '28456123',
      insurance: 'OSDE 310 (Póliza 88992)',
    });
  }
}
