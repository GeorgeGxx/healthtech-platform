import { Injectable, signal, effect } from '@angular/core';

/**
 * Servicio de control de inactividad conforme a la normativa HIPAA (§ 164.312(a)(2)(iii))
 * y la NOM-024-SSA3-2012 de Expediente Clínico Electrónico en México.
 *
 * Desconecta automáticamente la sesión tras un período de inactividad para proteger
 * la Información de Salud Protegida (PHI / Datos Personales Sensibles de Pacientes).
 */
@Injectable({
  providedIn: 'root',
})
export class HipaaSessionService {
  // Configuración de tiempos (en segundos)
  // En producción hospitalaria suele fijarse entre 10 y 15 minutos (600 a 900 s)
  private readonly TIMEOUT_SECONDS = 900; // 15 minutos de inactividad
  private readonly WARNING_SECONDS = 60;  // Advertencia 60 segundos antes del cierre

  // Signals reactivos para el estado de la sesión
  readonly secondsLeft = signal<number>(this.TIMEOUT_SECONDS);
  readonly isWarningVisible = signal<boolean>(false);
  readonly isLoggedOut = signal<boolean>(false);

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

      const elapsedSeconds = Math.floor(
        (Date.now() - this.lastActivityTimestamp) / 1000,
      );
      const remaining = Math.max(0, this.TIMEOUT_SECONDS - elapsedSeconds);

      this.secondsLeft.set(remaining);

      // Si quedan 60 segundos o menos, mostrar advertencia modal
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
    this.isWarningVisible.set(false);
    this.isLoggedOut.set(true);
    // Limpieza de datos confidenciales en memoria / storage
    sessionStorage.clear();
    console.warn(
      '🔒 Sesión finalizada automáticamente por inactividad (Cumplimiento HIPAA / NOM-024-SSA3-2012).',
    );
  }

  relogin(): void {
    this.isLoggedOut.set(false);
    this.recordActivity();
  }
}
