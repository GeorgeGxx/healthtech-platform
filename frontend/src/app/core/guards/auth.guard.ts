import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

/**
 * Controls access to the root ('') route, which is the medical center's public home:
 * - Authenticated user -> /dashboard
 * - Visitor / Guest -> Allows direct access at http://localhost/ (without redirecting the URL)
 */
export const rootRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};

/**
 * Protects routes that require sign-in (Patient or Reception)
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Protects administrative routes exclusive to Reception / Staff
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  if (auth.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};

/**
 * Protects clinical and operational routes accessible by both Reception and Attending Physicians
 */
export const clinicalStaffGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  if (auth.isAdmin() || auth.isDoctor()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};

