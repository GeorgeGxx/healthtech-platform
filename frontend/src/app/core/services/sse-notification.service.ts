import { Injectable, signal, inject, effect } from '@angular/core';
import { ToastService } from './toast.service.js';
import { AuthStateService } from './auth-state.service.js';

export interface SseNotificationItem {
  id: string;
  eventId: string;
  canal: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP';
  destinatario: string;
  asunto: string;
  contenido: string;
  estado: 'ENVIADO' | 'FALLIDO' | 'DUPLICADO_IGNORADO';
  fechaEnvio: string;
  leido?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SseNotificationService {
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthStateService);
  private eventSource: EventSource | null = null;

  readonly notifications = signal<SseNotificationItem[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly isConnected = signal<boolean>(false);

  constructor() {
    effect(() => {
      const isAuth = this.auth.isAuthenticated();
      const token = this.auth.accessToken();
      if (isAuth) {
        this.connect(token);
      } else {
        this.disconnect();
      }
    });
  }

  connect(token?: string | null): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return;
    }

    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      const effectiveToken = token ?? this.auth.accessToken();
      const url = effectiveToken
        ? `/api/notifications/stream?token=${encodeURIComponent(effectiveToken)}`
        : '/api/notifications/stream';
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected.set(true);
      };

      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          const notif: SseNotificationItem = JSON.parse(event.data);
          this.handleIncomingNotification(notif);
        } catch (e) {
          console.warn('Error parsing SSE notification message:', e);
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected.set(false);
      };
    } catch (err) {
      console.warn('Unable to open SSE connection:', err);
      this.isConnected.set(false);
    }
  }

  private handleIncomingNotification(notif: SseNotificationItem): void {
    notif.leido = false;
    this.notifications.update((list) => [notif, ...list.slice(0, 49)]);
    this.unreadCount.update((c) => c + 1);

    if (
      notif.asunto.includes('ALERTA DE STOCK') ||
      notif.asunto.includes('CRÍTICO') ||
      notif.asunto.includes('STOCK ALERT') ||
      notif.asunto.includes('CRITICAL')
    ) {
      this.toast.warning(notif.contenido, notif.asunto);
    } else if (
      notif.asunto.includes('Cancelación') ||
      notif.asunto.includes('COMPENSADA') ||
      notif.asunto.includes('Cancellation') ||
      notif.asunto.includes('COMPENSATED')
    ) {
      this.toast.error(notif.contenido, notif.asunto);
    } else if (
      notif.asunto.includes('Pago') ||
      notif.asunto.includes('Comprobante') ||
      notif.asunto.includes('Payment') ||
      notif.asunto.includes('Receipt')
    ) {
      this.toast.success(notif.contenido, notif.asunto);
    } else {
      this.toast.info(notif.contenido, notif.asunto);
    }
  }

  markAllAsRead(): void {
    this.notifications.update((list) =>
      list.map((item) => ({ ...item, leido: true })),
    );
    this.unreadCount.set(0);
  }

  clear(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected.set(false);
    }
  }
}
