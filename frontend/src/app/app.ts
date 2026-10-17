import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly isDark = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);

  toggleDarkMode() {
    this.isDark.update((v) => !v);
    if (this.isDark()) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }
}
