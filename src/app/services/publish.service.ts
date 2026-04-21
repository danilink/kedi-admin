import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PublishPayload {
  weekday: string;
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
  private readonly endpoint =
    'https://script.google.com/macros/s/AKfycbxlVInI-VLC7K1fSLRCmGyipK1nBzxlH4lZLNDlO4CIQ2bihVIPJRrxsF4MF1dYZeSv/exec';

  publishDay(payload: PublishPayload): Observable<{ ok: boolean; error?: string }> {
    return new Observable((observer) => {
      const body = new URLSearchParams({ payload: JSON.stringify(payload) });
      fetch(this.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-store',
        keepalive: true,
        body,
      })
        .then(() => {
          observer.next({ ok: true });
          observer.complete();
        })
        .catch((err) => {
          observer.error(err);
        });
    });
  }
}
