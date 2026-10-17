import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HipaaSessionModalComponent } from './core/components/hipaa-session-modal.component';
import { AuthStateService } from './core/services/auth-state.service';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    HipaaSessionModalComponent,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthStateService);
  private router = inject(Router);

  readonly isMobileMenuOpen = signal<boolean>(false);

  switchUser(role: 'admin_user' | 'basic_user' | 'guest'): void {
    if (role === 'admin_user') {
      this.auth.switchToAdmin();
    } else if (role === 'basic_user') {
      this.auth.switchToBasicUser();
    } else {
      this.auth.switchToGuest();
    }
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
