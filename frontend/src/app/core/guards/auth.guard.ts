import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';

/**
 * Redirige la raíz ('') según el estado de autenticación:
 * - Usuario autenticado -> /dashboard
 * - Visitante / Guest -> /servicios-y-costos
 */
export const rootRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }
  return router.createUrlTree(['/servicios-y-costos']);
};

/**
 * Protege rutas que requieren inicio de sesión (Paciente o Recepción)
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
 * Protege rutas administrativas exclusivas de Recepción / Staff
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  if (auth.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
