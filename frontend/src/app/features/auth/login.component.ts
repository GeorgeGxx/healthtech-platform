import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthStateService } from '../../core/services/auth-state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  username = '';
  password = '';
  returnUrl = '/dashboard';

  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
      }
    });

    // Si ya está autenticado, redirigir a dashboard
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  submitLogin(event: Event): void {
    event.preventDefault();
    this.errorMessage.set(null);
    this.isLoading.set(true);

    const res = this.auth.login(this.username, this.password);

    if (res.success) {
      this.isLoading.set(false);
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.isLoading.set(false);
      this.errorMessage.set(res.message || 'Error de autenticación');
    }
  }

  quickLoginAdmin(): void {
    this.auth.switchToAdmin();
    this.router.navigateByUrl(this.returnUrl);
  }

  quickLoginDoctor(): void {
    this.auth.switchToDoctor();
    this.router.navigateByUrl(this.returnUrl);
  }

  quickLoginPatient(): void {
    this.auth.switchToBasicUser();
    this.router.navigateByUrl(this.returnUrl);
  }

  continueAsGuest(): void {
    this.auth.switchToGuest();
    this.router.navigate(['/']);
  }
}
