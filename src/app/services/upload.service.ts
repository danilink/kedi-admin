import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, Subject, concat, of } from 'rxjs';
import { map, takeUntil, catchError, finalize } from 'rxjs/operators';
import { UploadItemDto } from '../models/invoice.models';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly cancelMap = new Map<string, Subject<void>>();

  constructor(private readonly http: HttpClient) {}

  createUpload(file: File): Observable<UploadItemDto> {
    const id = `upl-${crypto.randomUUID()}`;
    const cancel$ = new Subject<void>();
    this.cancelMap.set(id, cancel$);

    const base: UploadItemDto = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'queued',
    };

    const formData = new FormData();
    formData.append('files', file, file.name);

    const request$ = this.http.post<{ invoiceId: string }>('/api/invoices/upload', formData, {
      reportProgress: true,
      observe: 'events',
    });

    return concat(
      of({ ...base, status: 'uploading' as const }),
      request$.pipe(
        takeUntil(cancel$),
        map((event: HttpEvent<{ invoiceId: string }>) => {
          if (event.type === HttpEventType.UploadProgress) {
            const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
            return { ...base, progress, status: 'uploading' as const };
          }
          if (event.type === HttpEventType.Response) {
            return {
              ...base,
              progress: 100,
              status: 'uploaded' as const,
              invoiceId: event.body?.invoiceId,
            };
          }
          return { ...base, progress: 0, status: 'uploading' as const };
        }),
        catchError((err) => {
          return of({ ...base, progress: 0, status: 'error' as const, error: err?.message ?? 'Upload error' });
        })
      ),
    ).pipe(
      finalize(() => {
        cancel$.complete();
        this.cancelMap.delete(id);
      })
    );
  }

  cancelUpload(id: string): void {
    const cancel$ = this.cancelMap.get(id);
    if (!cancel$) return;
    cancel$.next();
    cancel$.complete();
    this.cancelMap.delete(id);
  }
}
