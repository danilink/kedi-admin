import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { apiUrl } from '../api-client';
import { Invoice, InvoiceLine, InvoiceLegalText, InvoiceTaxSummary } from '../models/invoice.models';

const USE_MOCKS = false;

type ListResponse = { items: Invoice[]; total: number };

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  constructor(private readonly http: HttpClient) {}

  listInvoices(filters: Record<string, any>, pageIndex: number, pageSize: number, sort?: { active?: string; direction?: 'asc' | 'desc' | '' }): Observable<ListResponse> {
    if (USE_MOCKS) {
      const items = buildMockInvoices();
      return of({ items, total: items.length }).pipe(delay(200));
    }

    const page = Math.max(1, pageIndex + 1);
    let params = new HttpParams()
      .set('page', String(page))
      .set('page_size', String(pageSize));

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params = params.set(key, String(value));
    });

    if (sort?.active && sort.direction) {
      params = params.set('sort_by', sort.active).set('sort_dir', sort.direction);
    }

    return this.http.get<any>(apiUrl('/invoices'), { params }).pipe(
      map((res) => {
        const items = Array.isArray(res?.items) ? res.items.map(mapInvoice) : Array.isArray(res) ? res.map(mapInvoice) : [];
        const total = Number(res?.total ?? res?.count ?? items.length);
        return { items, total: Number.isFinite(total) ? total : items.length };
      })
    );
  }

  upload(files: File[]): Observable<{ invoiceId: string; fileName: string }> {
    if (USE_MOCKS) {
      const id = `inv-${Math.random().toString(36).slice(2, 8)}`;
      return of({ invoiceId: id, fileName: files[0]?.name ?? 'archivo.pdf' }).pipe(delay(300));
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file, file.name));
    return this.http.post<{ invoiceId: string; fileName?: string }>(apiUrl('/invoices/upload'), formData).pipe(
      map((res) => ({ invoiceId: res.invoiceId, fileName: res.fileName ?? files[0]?.name ?? '' }))
    );
  }

  getInvoice(id: string): Observable<Invoice> {
    if (USE_MOCKS) return of(buildMockInvoices()[0]).pipe(delay(200));
    return this.http.get<any>(apiUrl(`/invoices/${id}`)).pipe(map(mapInvoice));
  }

  getFile(id: string) {
    return this.http.get(apiUrl(`/invoices/${id}/file`), {
      observe: 'response',
      responseType: 'blob',
    });
  }

  reprocess(id: string): Observable<Invoice> {
    if (USE_MOCKS) return of(buildMockInvoices()[0]).pipe(delay(200));
    return this.http.post<any>(apiUrl(`/invoices/${id}/reprocess`), {}).pipe(map(mapInvoice));
  }

  deleteInvoice(id: string): Observable<void> {
    if (USE_MOCKS) return of(void 0).pipe(delay(200));
    return this.http.delete<void>(apiUrl(`/invoices/${id}`));
  }

  getStatuses(ids: string[]): Observable<Invoice[]> {
    if (USE_MOCKS) return of(buildMockInvoices()).pipe(delay(200));
    const params = new HttpParams().set('ids', ids.join(','));
    return this.http.get<any[]>(apiUrl('/invoices/status'), { params }).pipe(
      map((items) => items.map(mapInvoice))
    );
  }

  getLines(id: string): Observable<InvoiceLine[]> {
    if (USE_MOCKS) return of(buildMockLines(id)).pipe(delay(200));
    return this.http.get<any[]>(apiUrl(`/invoices/${id}/lines`)).pipe(map((items) => items.map((raw) => mapLine(id, raw))));
  }

  getTaxes(id: string): Observable<InvoiceTaxSummary[]> {
    if (USE_MOCKS) return of(buildMockTaxes(id)).pipe(delay(200));
    return this.http.get<any[]>(apiUrl(`/invoices/${id}/taxes`)).pipe(map((items) => items.map((raw) => mapTax(id, raw))));
  }

  getLegal(id: string): Observable<InvoiceLegalText> {
    if (USE_MOCKS) return of(buildMockLegal(id)).pipe(delay(200));
    return this.http.get<any>(apiUrl(`/invoices/${id}/legal`)).pipe(map((raw) => mapLegal(id, raw)));
  }
}

function mapInvoice(raw: any): Invoice {
  const statusRaw = String(raw?.status ?? '').toLowerCase();
  const baseStatus = (['uploaded', 'processing', 'parsed', 'error'] as const).includes(statusRaw as any)
    ? (statusRaw as Invoice['status'])
    : 'processing';
  const status = raw?.raw_capture?.processing_error ? 'error' as const : baseStatus;
  const lineItems = Array.isArray(raw?.line_items)
    ? raw.line_items.map((item: any) => mapLine(String(raw?.id ?? ''), item))
    : undefined;
  return {
    id: String(raw?.id ?? ''),
    number: raw?.invoice_number ?? raw?.number ?? null,
    supplier: raw?.supplier_name
      ? { id: String(raw?.supplier_id ?? raw?.supplier_name), name: String(raw?.supplier_name) }
      : null,
    customer: raw?.customer_name
      ? { id: String(raw?.customer_id ?? raw?.customer_name), name: String(raw?.customer_name) }
      : undefined,
    currency: raw?.currency ?? null,
    status,
    issueDate: raw?.invoice_date ?? raw?.issueDate ?? null,
    dueDate: raw?.due_date ?? raw?.dueDate ?? null,
    subtotal: typeof raw?.subtotal === 'number' ? raw.subtotal : null,
    taxTotal: typeof raw?.tax_total === 'number' ? raw.tax_total : null,
    total: typeof raw?.total === 'number' ? raw.total : null,
    extractionConfidence: typeof raw?.extraction_confidence === 'number' ? raw.extraction_confidence : null,
    errorMessage: raw?.error_message ?? null,
    contentType: raw?.content_type ?? null,
    fileSize: typeof raw?.file_size === 'number' ? raw.file_size : null,
    storageBackend: raw?.storage_backend ?? null,
    originalFileName: String(raw?.original_filename ?? raw?.originalFileName ?? ''),
    createdAt: String(raw?.created_at ?? raw?.createdAt ?? ''),
    updatedAt: raw?.updated_at ?? raw?.updatedAt ?? null,
    lineItems,
  };
}

function mapLine(invoiceId: string, raw: any): InvoiceLine {
  return {
    id: String(raw?.id ?? ''),
    invoiceId,
    description: String(raw?.description ?? ''),
    quantity: typeof raw?.quantity === 'number' ? raw.quantity : null,
    unitPrice: typeof raw?.unit_price === 'number' ? raw.unit_price : (typeof raw?.unitPrice === 'number' ? raw.unitPrice : null),
    lineTotal: typeof raw?.line_total === 'number' ? raw.line_total : (typeof raw?.lineTotal === 'number' ? raw.lineTotal : null),
    taxRate: typeof raw?.tax_rate === 'number' ? raw.tax_rate : null,
    productCode: raw?.product_code ?? null,
    confidence: typeof raw?.confidence === 'number' ? raw.confidence : null,
    normalizedProductId: raw?.normalized_product_id ?? null,
  };
}

function mapTax(invoiceId: string, raw: any): InvoiceTaxSummary {
  return {
    id: String(raw?.id ?? `${invoiceId}-${raw?.tax_rate ?? 'tax'}`),
    invoiceId,
    taxRate: typeof raw?.tax_rate === 'number' ? raw.tax_rate : null,
    taxableBase: typeof raw?.taxable_base === 'number' ? raw.taxable_base : null,
    taxTotal: typeof raw?.tax_total === 'number' ? raw.tax_total : null,
  };
}

function mapLegal(invoiceId: string, raw: any): InvoiceLegalText {
  return {
    invoiceId,
    returns: raw?.returns ?? null,
    privacy: raw?.privacy ?? null,
    packaging: raw?.packaging ?? null,
    registry: raw?.registry ?? null,
  };
}

function buildMockInvoices(): Invoice[] {
  return [
    {
      id: 'inv-1',
      number: 'F-2024-001',
      supplier: { id: 'sup-1', name: 'Distribuciones Norte' },
      currency: 'EUR',
      status: 'parsed',
      issueDate: '2024-11-08',
      subtotal: 245.8,
      taxTotal: 51.62,
      total: 297.42,
      extractionConfidence: 0.92,
      originalFileName: 'factura-001.pdf',
      createdAt: '2024-11-08T10:12:00Z',
      updatedAt: '2024-11-08T10:15:00Z',
    },
  ];
}

function buildMockLines(invoiceId: string): InvoiceLine[] {
  return [
    {
      id: 'line-1',
      invoiceId,
      description: 'Aceite oliva 5L',
      quantity: 2,
      unitPrice: 28.5,
      lineTotal: 57,
      taxRate: 10,
      productCode: 'A-OLI-5L',
      confidence: 0.88,
      normalizedProductId: null,
    },
  ];
}

function buildMockTaxes(invoiceId: string): InvoiceTaxSummary[] {
  return [
    { id: 'tax-1', invoiceId, taxRate: 10, taxableBase: 220, taxTotal: 22 },
    { id: 'tax-2', invoiceId, taxRate: 21, taxableBase: 25.8, taxTotal: 5.42 },
  ];
}

function buildMockLegal(invoiceId: string): InvoiceLegalText {
  return {
    invoiceId,
    returns: 'Devoluciones en 14 días.',
    privacy: 'Datos tratados según RGPD.',
    packaging: 'Gestión de envases incluida.',
    registry: 'Registro Mercantil de Madrid.',
  };
}
