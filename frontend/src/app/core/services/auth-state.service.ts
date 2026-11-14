import { Injectable, signal, computed, inject, isDevMode } from '@angular/core';
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
  name: 'Medical Center Visitor',
  email: '',
  role: 'guest',
  roleTitle: 'Visitor (Unauthenticated)',
  roles: [],
};

export const ADMIN_USER: AppUser = {
  id: 'usr-recep-01',
  username: 'admin_user',
  name: 'Sofia Ramos',
  email: 'recepcion@centromedico.mx',
  role: 'admin_user',
  roleTitle: 'Reception & Medical Coordination',
  roles: ['admin_user', 'receptionist_user'],
};

export const DOCTOR_USER: AppUser = {
  id: 'usr-doc-02',
  username: 'doctor_user',
  name: 'Dr. Laura Gomez',
  email: 'laura.gomez@centromedico.mx',
  role: 'doctor_user',
  roleTitle: 'Attending Specialist Physician',
  roles: ['doctor_user'],
  doctorId: 2,
  license: 'MN-10002',
  specialty: 'Dermatology',
};

export const BASIC_USER: AppUser = {
  id: 'usr-patient-01',
  username: 'basic_user',
  name: 'Juan Perez Garcia',
  email: 'juan.perez@email.com',
  role: 'basic_user',
  roleTitle: 'Primary Patient',
  roles: ['basic_user'],
  patientId: 1,
  dni: '28456123',
  insurance: 'GNP Insurance (Policy 88992)',
};

const TOKEN_STORAGE_KEY = 'healthtech_access_token';
const ROLE_STORAGE_KEY = 'healthtech_user_role';

@Injectable({
  providedIn: 'root',
})
export class AuthStateService {
  private readonly router = inject(Router);

  readonly accessToken = signal<string | null>(this.loadInitialToken());
  readonly currentUser = signal<AppUser>(this.loadInitialUser());

  readonly isAdmin = computed(() => this.currentUser().role === 'admin_user');
  readonly isDoctor = computed(() => this.currentUser().role === 'doctor_user');
  readonly isBasicUser = computed(() => this.currentUser().role === 'basic_user');
  readonly isGuest = computed(() => this.currentUser().role === 'guest');
  readonly isAuthenticated = computed(() => this.currentUser().role !== 'guest');
  readonly canManageRecords = computed(
    () => this.currentUser().role === 'admin_user' || this.currentUser().role === 'doctor_user',
  );

  async loginWithKeycloak(
    username: string,
    password: string,
  ): Promise<{ success: boolean; message?: string }> {
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();
    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter username and password.' };
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'password',
        client_id: 'healthtech-platform',
        username: cleanUser,
        password: cleanPass,
      });

      const response = await fetch('/realms/healthtech-realm/protocol/openid-connect/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (response.ok) {
        const data = (await response.json()) as { access_token?: string };
        if (data.access_token) {
          const user = this.buildUserFromJwt(data.access_token);
          this.setToken(data.access_token);
          this.setUser(user);
          return { success: true };
        }
      }

      if (response.status === 401 || response.status === 400) {
        if (isDevMode()) {
          const devResult = this.login(cleanUser, cleanPass);
          if (devResult.success) return devResult;
        }
        return {
          success: false,
          message: 'Invalid Keycloak OIDC credentials.',
        };
      }
    } catch {
      if (isDevMode()) {
        return this.login(cleanUser, cleanPass);
      }
    }

    if (isDevMode()) {
      return this.login(cleanUser, cleanPass);
    }

    return {
      success: false,
      message: 'Keycloak identity service unavailable.',
    };
  }

  login(username: string, password: string): { success: boolean; message?: string } {
    if (!isDevMode()) {
      return { success: false, message: 'Use Keycloak OIDC authentication in production.' };
    }

    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();

    if (
      (u === 'admin_user' || u === 'admin' || u === 'recepcion' || u === 'sofia' || u === 'recepcion@centromedico.mx') &&
      (p === 'admin' || p === 'Admin123!' || p === 'admin123')
    ) {
      this.setUser(ADMIN_USER);
      return { success: true };
    }

    if (
      (u === 'doctor_user' || u === 'doctor' || u === 'medico' || u === 'laura' || u === 'laura.gomez' || u === 'dr.gomez' || u === 'laura.gomez@centromedico.mx') &&
      (p === 'doctor' || p === 'Doctor123!' || p === 'admin' || p === 'doctor123')
    ) {
      this.setUser(DOCTOR_USER);
      return { success: true };
    }

    if (
      (u === 'basic_user' || u === 'user' || u === 'paciente' || u === 'juan' || u === 'juan.perez' || u === 'juan.perez@email.com') &&
      (p === 'user' || p === 'User123!' || p === 'admin' || p === 'user123')
    ) {
      this.setUser(BASIC_USER);
      return { success: true };
    }

    return {
      success: false,
      message: 'Invalid credentials. You can sign in with doctor_user / Doctor123!, admin_user / Admin123!, or basic_user / User123!.',
    };
  }

  logout(redirectTo = '/'): void {
    this.setToken(null);
    this.setUser(GUEST_USER);
    try {
      localStorage.removeItem(ROLE_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
    this.router.navigate([redirectTo]);
  }

  switchToAdmin(): void {
    if (!isDevMode()) return;
    this.setUser(ADMIN_USER);
    this.router.navigate(['/dashboard']);
  }

  switchToDoctor(): void {
    if (!isDevMode()) return;
    this.setUser(DOCTOR_USER);
    this.router.navigate(['/medical-records']);
  }

  switchToBasicUser(): void {
    if (!isDevMode()) return;
    this.setUser(BASIC_USER);
    this.router.navigate(['/dashboard']);
  }

  switchToGuest(): void {
    this.logout('/');
  }

  private buildUserFromJwt(token: string): AppUser {
    try {
      const payloadSegment = token.split('.')[1] ?? '';
      const normalized = payloadSegment.replaceAll('-', '+').replaceAll('_', '/');
      const payload = JSON.parse(atob(normalized)) as {
        sub?: string;
        preferred_username?: string;
        name?: string;
        email?: string;
        realm_access?: { roles?: string[] };
        resource_access?: Record<string, { roles?: string[] }>;
      };

      const realmRoles = payload.realm_access?.roles ?? [];
      const clientRoles = Object.values(payload.resource_access ?? {}).flatMap((r) => r.roles ?? []);
      const roles = Array.from(new Set([...realmRoles, ...clientRoles]));

      let primaryRole: AppUser['role'] = 'basic_user';
      if (roles.includes('admin_user')) primaryRole = 'admin_user';
      else if (roles.includes('doctor_user')) primaryRole = 'doctor_user';

      const base =
        primaryRole === 'admin_user'
          ? ADMIN_USER
          : primaryRole === 'doctor_user'
            ? DOCTOR_USER
            : BASIC_USER;

      return {
        ...base,
        id: payload.sub || base.id,
        username: payload.preferred_username || base.username,
        name: payload.name || payload.preferred_username || base.name,
        email: payload.email || base.email,
        role: primaryRole,
        roles,
      };
    } catch {
      return BASIC_USER;
    }
  }

  private setToken(token: string | null): void {
    this.accessToken.set(token);
    try {
      if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
  }

  private setUser(user: AppUser): void {
    this.currentUser.set(user);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, user.role);
    } catch {}
  }

  private loadInitialToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private loadInitialUser(): AppUser {
    const token = this.loadInitialToken();
    if (token) {
      return this.buildUserFromJwt(token);
    }
    if (!isDevMode()) {
      return GUEST_USER;
    }
    try {
      const savedRole = localStorage.getItem(ROLE_STORAGE_KEY);
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
