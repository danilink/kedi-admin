import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  if (!req.url.startsWith('/api')) return next(req);
  if (!token) {
    auth.signOut();
    void router.navigateByUrl('/login');
    return EMPTY;
  }
  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
};
