import { Injectable, signal, inject } from '@angular/core';
import { AuthStateService } from './auth-state.service';

/**
 * Inactivity control service compliant with HIPAA (§ 164.312(a)(2)(iii))
 * and NOM-024-SSA3-2012 for Electronic Health Records in Mexico.
 *
 * Automatically terminates the session after an inactivity period to protect
 * Protected Health Information (PHI / Sensitive Patient Personal Data).
 */
@Injectable({
  providedIn: 'root',
})
export class HipaaSessionService {
  private readonly authState = inject(AuthStateService);

  private readonly TIMEOUT_SECONDS = 900; // 15 minutes of inactivity
  private readonly WARNING_SECONDS = 60;  // Warning 60 seconds before logout

  readonly secondsLeft = signal<number>(this.TIMEOUT_SECONDS);
  readonly isWarningVisible = signal<boolean>(false);
  readonly isLoggedOut = signal<boolean>(false);
  readonly lockedUsername = signal<string>('');
  readonly reloginError = signal<string | null>(null);

  private timerInterval: any = null;
  private lastActivityTimestamp: number = Date.now();

  constructor() {
    this.initUserActivityListeners();
    this.startInactivityTimer();
  }

  private initUserActivityListeners(): void {
    if (typeof window === 'undefined') return;

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, () => this.recordActivity(), {
        passive: true,
      });
    });
  }

  recordActivity(): void {
    if (this.isLoggedOut()) return;

    this.lastActivityTimestamp = Date.now();
    this.secondsLeft.set(this.TIMEOUT_SECONDS);

    if (this.isWarningVisible()) {
      this.isWarningVisible.set(false);
    }
  }

  private startInactivityTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.isLoggedOut()) return;
      if (!this.authState.isAuthenticated()) return;

      const elapsedSeconds = Math.floor(
        (Date.now() - this.lastActivityTimestamp) / 1000,
      );
      const remaining = Math.max(0, this.TIMEOUT_SECONDS - elapsedSeconds);

      this.secondsLeft.set(remaining);

      if (remaining <= this.WARNING_SECONDS && remaining > 0) {
        this.isWarningVisible.set(true);
      } else if (remaining === 0) {
        this.forceLogoutDueToInactivity();
      }
    }, 1000);
  }

  extendSession(): void {
    this.recordActivity();
  }

  forceLogoutDueToInactivity(): void {
    const current = this.authState.currentUser();
    this.lockedUsername.set(current?.username && current.username !== 'guest' ? current.username : '');
    this.reloginError.set(null);
    this.isWarningVisible.set(false);
    this.isLoggedOut.set(true);
    try {
      sessionStorage.clear();
      localStorage.removeItem('healthtech_user_role');
    } catch {}
    this.authState.logout('/login');
    console.warn(
      '🔒 Session automatically terminated due to inactivity (HIPAA / NOM-024-SSA3-2012 compliance).',
    );
  }

  async relogin(password: string): Promise<boolean> {
    this.reloginError.set(null);
    const username = this.lockedUsername();
    if (!username || !password.trim()) {
      this.reloginError.set('Enter your password to verify your identity.');
      return false;
    }

    const res = await this.authState.loginWithKeycloak(username, password);
    if (!res.success) {
      this.reloginError.set(res.message || 'Invalid credentials.');
      return false;
    }

    this.isLoggedOut.set(false);
    this.recordActivity();
    return true;
  }

  dismissToLogin(): void {
    this.isLoggedOut.set(false);
    this.reloginError.set(null);
    this.authState.logout('/login');
  }
}
