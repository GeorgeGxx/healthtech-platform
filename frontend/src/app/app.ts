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

  readonly isDark = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);

  switchUser(role: 'admin_user' | 'basic_user'): void {
    if (role === 'admin_user') {
      this.auth.switchToAdmin();
      this.router.navigate(['/dashboard']);
    } else {
      this.auth.switchToBasicUser();
      this.router.navigate(['/appointments']);
    }
  }

  toggleDarkMode(): void {
    this.isDark.update((v) => !v);
    if (this.isDark()) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
