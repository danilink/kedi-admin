import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = error?.error?.message || error?.message || 'Error inesperado. Inténtalo de nuevo.';
      snackBar.open(message, 'Cerrar', { duration: 4000, panelClass: ['snackbar-error'] });
      return throwError(() => error);
    })
  );
};
