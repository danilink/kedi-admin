import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const status = error?.status ?? 0;
      const message = statusMessage(status);
      snackBar.open(message, 'Cerrar', { duration: 4000, panelClass: ['snackbar-error'] });
      return throwError(() => error);
    })
  );
};

function statusMessage(status: number) {
  const map: Record<number, string> = {
    0: 'No se pudo conectar con el servidor.',
    400: 'Solicitud incorrecta.',
    401: 'No autorizado. Inicia sesión de nuevo.',
    403: 'No tienes permisos para esta acción.',
    404: 'Recurso no encontrado.',
    409: 'Conflicto con el estado actual.',
    422: 'Datos inválidos. Revisa los campos.',
    429: 'Demasiadas solicitudes. Inténtalo más tarde.',
    500: 'Error interno del servidor.',
    502: 'Servidor no disponible.',
    503: 'Servicio en mantenimiento.',
  };
  return map[status] ?? 'Error inesperado. Inténtalo de nuevo.';
}
