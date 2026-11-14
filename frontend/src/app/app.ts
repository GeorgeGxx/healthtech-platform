import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HipaaSessionModalComponent } from './core/components/hipaa-session-modal.component';
import { ToastContainerComponent } from './core/components/toast-container.component';
import { AuthStateService } from './core/services/auth-state.service';
import { SseNotificationService } from './core/services/sse-notification.service';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    HipaaSessionModalComponent,
    ToastContainerComponent,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthStateService);
  readonly sse = inject(SseNotificationService);
  private router = inject(Router);

  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly isNotificationOpen = signal<boolean>(false);

  toggleNotificationDropdown(): void {
    this.isNotificationOpen.update((v) => !v);
  }

  closeNotificationDropdown(): void {
    this.isNotificationOpen.set(false);
  }

  switchUser(role: 'admin_user' | 'doctor_user' | 'basic_user' | 'guest'): void {
    if (role === 'guest') {
      this.auth.switchToGuest();
      return;
    }
    void this.auth.startPkceLogin();
  }

  logout(): void {
    this.auth.logout();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
