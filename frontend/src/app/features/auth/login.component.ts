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
    this.route.queryParams.subscribe(async (params) => {
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
      }
      if (params['code'] && params['state']) {
        this.isLoading.set(true);
        const res = await this.auth.handleOidcCallback(params['code'], params['state']);
        this.isLoading.set(false);
        if (res.success) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.errorMessage.set(res.message || 'OIDC authentication failed');
        }
      }
    });

    // If already authenticated, redirect to dashboard
    if (this.auth.isAuthenticated()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  async submitLogin(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set(null);
    this.isLoading.set(true);

    const res = await this.auth.loginWithKeycloak(this.username, this.password);

    this.isLoading.set(false);
    if (res.success) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.errorMessage.set(res.message || 'Authentication error');
    }
  }

  async loginWithSso(): Promise<void> {
    await this.auth.startPkceLogin();
  }

  quickLoginAdmin(): void {
    void this.auth.startPkceLogin();
  }

  quickLoginDoctor(): void {
    void this.auth.startPkceLogin();
  }

  quickLoginPatient(): void {
    void this.auth.startPkceLogin();
  }

  continueAsGuest(): void {
    this.auth.switchToGuest();
    this.router.navigate(['/']);
  }
}
