import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { InvoiceDto, InvoiceFilters, InvoiceListResponse } from '../models/invoice.models';

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private readonly baseUrl = '/api/invoices';

  constructor(private readonly http: HttpClient) {}

  list(filters: InvoiceFilters, pageIndex: number, pageSize: number, sort: { active: keyof InvoiceDto; direction: 'asc' | 'desc' | '' }): Observable<InvoiceListResponse> {
    const page = Math.max(1, pageIndex + 1);
    let params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(pageSize));

    if (filters.vendor) params = params.set('vendor', filters.vendor);
    if (filters.status && filters.status !== 'all') params = params.set('status', filters.status);
    if (filters.dateFrom) params = params.set('date_from', filters.dateFrom);
    if (filters.dateTo) params = params.set('date_to', filters.dateTo);
    if (filters.totalMin !== null && filters.totalMin !== undefined) params = params.set('total_min', String(filters.totalMin));
    if (filters.totalMax !== null && filters.totalMax !== undefined) params = params.set('total_max', String(filters.totalMax));
    if (filters.currency) params = params.set('currency', filters.currency);
    if (filters.query) params = params.set('query', filters.query);

    if (sort.active && sort.direction) {
      params = params.set('sort_by', String(sort.active)).set('sort_dir', sort.direction);
    }

    return this.http.get<any>(this.baseUrl, { params }).pipe(
      map((res) => this.mapListResponse(res))
    );
  }

  getById(id: string): Observable<InvoiceDto> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(
      map((res) => this.mapInvoice(res))
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  retryExtraction(id: string): Observable<InvoiceDto> {
    return this.http.post<InvoiceDto>(`${this.baseUrl}/${id}/reprocess`, {});
  }

  getStatuses(ids: string[]): Observable<InvoiceDto[]> {
    const params = new HttpParams().set('ids', ids.join(','));
    return this.http.get<InvoiceDto[]>(`${this.baseUrl}/status`, { params });
  }

  getFile(id: string) {
    return this.http.get(`${this.baseUrl}/${id}/file`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  downloadFile(id: string, fallbackName?: string): Observable<void> {
    return this.getFile(id).pipe(
      map((res) => {
        const blob = res.body;
        if (!blob) throw new Error('No se pudo descargar el fichero.');
        const fileName = this.fileNameFromDisposition(res.headers.get('content-disposition'))
          ?? fallbackName
          ?? `factura-${id}.pdf`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      })
    );
  }

  private fileNameFromDisposition(value: string | null) {
    if (!value) return null;
    const match = /filename\*?=(?:UTF-8'')?\"?([^\";]+)\"?/i.exec(value);
    if (!match?.[1]) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  private mapListResponse(res: any): InvoiceListResponse {
    if (Array.isArray(res)) {
      const items = res.map((item) => this.mapInvoice(item));
      return { items, total: items.length };
    }
    const rawItems = res?.items ?? res?.data ?? res?.results ?? [];
    const items = Array.isArray(rawItems) ? rawItems.map((item) => this.mapInvoice(item)) : [];
    const total = Number(res?.total ?? res?.count ?? items.length);
    return { items, total: Number.isFinite(total) ? total : items.length };
  }

  private mapInvoice(raw: any): InvoiceDto {
    const statusRaw = String(raw?.status ?? '').toLowerCase();
    const baseStatus = (['uploaded', 'processing', 'parsed', 'error'] as const).includes(statusRaw as any)
      ? (statusRaw as InvoiceDto['status'])
      : 'processing';
    const status = raw?.raw_capture?.processing_error ? 'error' as const : baseStatus;

    return {
      id: String(raw?.id ?? ''),
      number: String(raw?.invoice_number ?? raw?.number ?? ''),
      vendor: String(raw?.supplier_name ?? raw?.vendor ?? ''),
      currency: raw?.currency ?? 'EUR',
      status,
      issueDate: String(raw?.invoice_date ?? raw?.issueDate ?? raw?.issue_date ?? ''),
      dueDate: raw?.due_date ? String(raw?.due_date) : raw?.dueDate ? String(raw?.dueDate) : undefined,
      confidence: typeof raw?.extraction_confidence === 'number' ? raw.extraction_confidence : raw?.confidence,
      subtotal: typeof raw?.subtotal === 'number' ? raw.subtotal : 0,
      tax: typeof raw?.tax_total === 'number' ? raw.tax_total : (typeof raw?.tax === 'number' ? raw.tax : 0),
      total: typeof raw?.total === 'number' ? raw.total : 0,
      notes: raw?.error_message ?? raw?.notes ?? undefined,
      originalFileName: String(raw?.original_filename ?? raw?.originalFileName ?? ''),
      originalUrl: raw?.originalUrl ?? raw?.original_url ?? undefined,
      lines: Array.isArray(raw?.line_items)
        ? raw.line_items.map((line: any) => ({
            id: String(line?.id ?? ''),
            description: String(line?.description ?? ''),
            quantity: Number(line?.quantity ?? 0),
            unitPrice: Number(line?.unit_price ?? line?.unitPrice ?? 0),
            taxRate: typeof line?.tax_rate === 'number' ? line.tax_rate : line?.taxRate,
            total: Number(line?.line_total ?? line?.total ?? 0),
          }))
        : Array.isArray(raw?.lines)
          ? raw.lines
          : undefined,
      createdAt: String(raw?.created_at ?? raw?.createdAt ?? ''),
      updatedAt: String(raw?.updated_at ?? raw?.updatedAt ?? raw?.created_at ?? raw?.createdAt ?? ''),
    };
  }
}
