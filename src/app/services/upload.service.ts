import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, Subject, concat, of } from 'rxjs';
import { map, takeUntil, catchError, finalize } from 'rxjs/operators';
import { UploadItemDto } from '../models/invoice.models';

type UploadApiResult = {
  status: 'imported' | 'duplicate' | 'partial' | 'failed';
  sourceId: string;
  invoiceId: string | null;
  supplierId: string | null;
  customerId: string | null;
  warnings: string[];
};

type LegacyUploadResult = {
  invoiceId?: string;
};

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

    const request$ = this.http.post<UploadApiResult[] | UploadApiResult | LegacyUploadResult | null>('/api/invoices/upload', formData, {
      reportProgress: true,
      observe: 'events',
    });

    return concat(
      of({ ...base, status: 'uploading' as const }),
      request$.pipe(
        takeUntil(cancel$),
        map((event: HttpEvent<UploadApiResult[] | UploadApiResult | LegacyUploadResult | null>) => {
          if (event.type === HttpEventType.UploadProgress) {
            const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
            return { ...base, progress, status: 'uploading' as const };
          }
          if (event.type === HttpEventType.Response) {
            const result = normalizeUploadResult(event.body);
            const isLegacy = !!(result && !('status' in result));
            const warnings = !isLegacy && result ? result.warnings ?? [] : [];
            if (!isLegacy && result?.status === 'duplicate') warnings.unshift('Factura duplicada');
            if (!isLegacy && result?.status === 'partial') warnings.unshift('Factura parcialmente importada');
            const status: UploadItemDto['status'] = !isLegacy && result?.status === 'failed' ? 'error' : 'uploaded';
            const error = status === 'error' ? warnings.join(' · ') || 'Upload error' : undefined;
            return {
              ...base,
              progress: 100,
              status,
              invoiceId: result?.invoiceId ?? undefined,
              warnings,
              error,
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

function normalizeUploadResult(body: UploadApiResult[] | UploadApiResult | LegacyUploadResult | null | undefined) {
  if (!body) return null;
  if (Array.isArray(body)) return body[0] ?? null;
  return body;
}
