import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from '../services/auth-state.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStateService);
  const currentUser = auth.currentUser();

  if (!currentUser || currentUser.role === 'guest') {
    return next(req);
  }

  const roles = (currentUser.roles && currentUser.roles.length > 0)
    ? currentUser.roles.join(',')
    : currentUser.role;

  const authReq = req.clone({
    setHeaders: {
      'x-user-roles': roles,
      'x-user-id': currentUser.id || currentUser.username,
      'x-user-name': currentUser.name,
    },
  });

  return next(authReq);
};
