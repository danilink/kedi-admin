import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface PublishPayload {
  weekday: string;
  is_holiday: boolean;
  platoDelDia: string;
  precioPlatoDelDia: number | null;
  precioMenu: number | null;
  primeros: string[];
  segundos: string[];
  postres: string[];
  telefono: string;
  notas: string;
}

@Injectable({ providedIn: 'root' })
export class PublishService {
  private readonly auth = inject(AuthService);
  private readonly endpoint = `${environment.apiBaseUrl}/menus/days`;
  private readonly weekdayMap: Record<string, string> = {
    Lunes: 'Lunes',
    Martes: 'Martes',
    Miércoles: 'Miercoles',
    Jueves: 'Jueves',
    Viernes: 'Viernes',
  };

  publishDay(payload: PublishPayload, method: 'PATCH' | 'PUT' = 'PATCH'): Observable<{ ok: boolean; error?: string }> {
    return new Observable((observer) => {
      const weekday = this.weekdayMap[payload.weekday] ?? payload.weekday?.toLowerCase?.() ?? payload.weekday;
      const token = this.auth.token();

      if (!token) {
        observer.next({ ok: false, error: 'No hay token de autenticación.' });
        observer.complete();
        return;
      }

      fetch(`${this.endpoint}/${weekday}`, {
        method,
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          if (!res.ok) {
            const message = await res.text();
            observer.next({ ok: false, error: message || `Error ${res.status}` });
            observer.complete();
            return;
          }
          observer.next({ ok: true });
          observer.complete();
        })
        .catch((err) => {
          observer.error(err);
        });
    });
  }
}
