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

const TOKEN_STORAGE_KEY = 'healthtech_access_token';
const ID_TOKEN_STORAGE_KEY = 'healthtech_id_token';
const ROLE_STORAGE_KEY = 'healthtech_user_role';
const PKCE_VERIFIER_KEY = 'healthtech_pkce_verifier';
const PKCE_STATE_KEY = 'healthtech_pkce_state';

const KEYCLOAK_AUTH_URL = '/realms/healthtech-realm/protocol/openid-connect/auth';
const KEYCLOAK_TOKEN_URL = '/realms/healthtech-realm/protocol/openid-connect/token';
const KEYCLOAK_LOGOUT_URL = '/realms/healthtech-realm/protocol/openid-connect/logout';
const OIDC_CLIENT_ID = 'healthtech-platform';

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

  /**
   * Starts OIDC Authorization Code Flow with PKCE (S256) against Keycloak.
   */
  async startPkceLogin(): Promise<void> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      return;
    }

    const verifierBytes = new Uint8Array(32);
    window.crypto.getRandomValues(verifierBytes);
    const verifier = this.base64UrlEncode(verifierBytes);
    const stateBytes = new Uint8Array(16);
    window.crypto.getRandomValues(stateBytes);
    const state = this.base64UrlEncode(stateBytes);

    const digest = await window.crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(verifier),
    );
    const challenge = this.base64UrlEncode(new Uint8Array(digest));

    try {
      sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
      sessionStorage.setItem(PKCE_STATE_KEY, state);
    } catch {}

    const redirectUri = `${window.location.origin}/login`;
    const params = new URLSearchParams({
      client_id: OIDC_CLIENT_ID,
      response_type: 'code',
      scope: 'openid profile email',
      redirect_uri: redirectUri,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    window.location.assign(`${KEYCLOAK_AUTH_URL}?${params.toString()}`);
  }

  /**
   * Completes the OIDC Authorization Code + PKCE callback by exchanging the code for tokens.
   */
  async handleOidcCallback(code: string, state: string): Promise<{ success: boolean; message?: string }> {
    let expectedState: string | null = null;
    let verifier: string | null = null;
    try {
      expectedState = sessionStorage.getItem(PKCE_STATE_KEY);
      verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
      sessionStorage.removeItem(PKCE_STATE_KEY);
      sessionStorage.removeItem(PKCE_VERIFIER_KEY);
    } catch {}

    if (!expectedState || state !== expectedState || !verifier) {
      return { success: false, message: 'Invalid OIDC state or missing PKCE verifier.' };
    }

    try {
      const redirectUri = `${window.location.origin}/login`;
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: OIDC_CLIENT_ID,
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      });

      const response = await fetch(KEYCLOAK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        return { success: false, message: 'Failed to exchange OIDC authorization code.' };
      }

      const data = (await response.json()) as { access_token?: string; id_token?: string };
      if (!data.access_token) {
        return { success: false, message: 'Keycloak token response missing access_token.' };
      }

      this.setToken(data.access_token, data.id_token);
      this.setUser(this.buildUserFromJwt(data.access_token));
      return { success: true };
    } catch {
      return { success: false, message: 'Keycloak token exchange failed.' };
    }
  }

  /**
   * Direct credential sign-in is only permitted in local development mode;
   * production uses OIDC Authorization Code + PKCE via startPkceLogin().
   */
  async loginWithKeycloak(
    username: string,
    password: string,
  ): Promise<{ success: boolean; message?: string }> {
    if (!isDevMode()) {
      await this.startPkceLogin();
      return { success: false, message: 'Redirecting to Keycloak OIDC PKCE login.' };
    }

    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();
    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter username and password.' };
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'password',
        client_id: OIDC_CLIENT_ID,
        username: cleanUser,
        password: cleanPass,
      });

      const response = await fetch(KEYCLOAK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (response.ok) {
        const data = (await response.json()) as { access_token?: string; id_token?: string };
        if (data.access_token) {
          this.setToken(data.access_token, data.id_token);
          this.setUser(this.buildUserFromJwt(data.access_token));
          return { success: true };
        }
      }

      return {
        success: false,
        message: 'Invalid Keycloak OIDC credentials.',
      };
    } catch {
      return {
        success: false,
        message: 'Keycloak identity service unavailable.',
      };
    }
  }

  logout(redirectTo = '/'): void {
    let idToken: string | null = null;
    try {
      idToken = sessionStorage.getItem(ID_TOKEN_STORAGE_KEY);
      localStorage.removeItem(ROLE_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(ID_TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(PKCE_VERIFIER_KEY);
      sessionStorage.removeItem(PKCE_STATE_KEY);
    } catch {}

    this.setToken(null);
    this.setUser(GUEST_USER);

    if (idToken && typeof window !== 'undefined') {
      const params = new URLSearchParams({
        id_token_hint: idToken,
        post_logout_redirect_uri: `${window.location.origin}${redirectTo}`,
      });
      window.location.assign(`${KEYCLOAK_LOGOUT_URL}?${params.toString()}`);
      return;
    }

    this.router.navigate([redirectTo]);
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
        exp?: number;
        preferred_username?: string;
        name?: string;
        email?: string;
        patient_id?: number;
        doctor_id?: number;
        realm_access?: { roles?: string[] };
        resource_access?: Record<string, { roles?: string[] }>;
      };

      if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
        return GUEST_USER;
      }

      const realmRoles = payload.realm_access?.roles ?? [];
      const clientRoles = Object.values(payload.resource_access ?? {}).flatMap((r) => r.roles ?? []);
      const roles = Array.from(new Set([...realmRoles, ...clientRoles]));

      let primaryRole: AppUser['role'] = 'basic_user';
      let roleTitle = 'Patient';
      if (roles.includes('admin_user')) {
        primaryRole = 'admin_user';
        roleTitle = 'Administrator';
      } else if (roles.includes('doctor_user')) {
        primaryRole = 'doctor_user';
        roleTitle = 'Attending Physician';
      }

      return {
        id: payload.sub || 'unknown',
        username: payload.preferred_username || payload.sub || 'unknown',
        name: payload.name || payload.preferred_username || 'Authenticated User',
        email: payload.email || '',
        role: primaryRole,
        roleTitle,
        roles,
        patientId: payload.patient_id,
        doctorId: payload.doctor_id,
      };
    } catch {
      return GUEST_USER;
    }
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private setToken(token: string | null, idToken?: string): void {
    this.accessToken.set(token);
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
        if (idToken) sessionStorage.setItem(ID_TOKEN_STORAGE_KEY, idToken);
      } else {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(ID_TOKEN_STORAGE_KEY);
      }
    } catch {}
  }

  private setUser(user: AppUser): void {
    this.currentUser.set(user);
    try {
      if (user.role === 'guest') localStorage.removeItem(ROLE_STORAGE_KEY);
      else localStorage.setItem(ROLE_STORAGE_KEY, user.role);
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
    return GUEST_USER;
  }
}
