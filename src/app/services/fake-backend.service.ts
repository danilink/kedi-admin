import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, timer } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { CompareJobDto, CompareResultDto, InvoiceDto, InvoiceFilters, InvoiceListResponse, InvoiceLineDto, InvoiceStatus } from '../models/invoice.models';

const VENDORS = ['Acme Corp', 'Logística Norte', 'IberFoods', 'Café Central', 'Electricidad Sur'];
const CURRENCIES = ['EUR', 'USD'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomMoney(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function buildLines(): InvoiceLineDto[] {
  const count = 2 + Math.floor(Math.random() * 4);
  const lines: InvoiceLineDto[] = [];
  for (let i = 0; i < count; i += 1) {
    const qty = 1 + Math.floor(Math.random() * 4);
    const unitPrice = randomMoney(6, 42);
    const total = Math.round(qty * unitPrice * 100) / 100;
    lines.push({
      id: `line-${crypto.randomUUID()}`,
      description: `Concepto ${i + 1}`,
      quantity: qty,
      unitPrice,
      taxRate: 0.21,
      total,
    });
  }
  return lines;
}

function buildInvoice(id: string, overrides: Partial<InvoiceDto> = {}): InvoiceDto {
  const lines = buildLines();
  const subtotal = Math.round(lines.reduce((acc, l) => acc + l.total, 0) * 100) / 100;
  const tax = Math.round(subtotal * 0.21 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const today = new Date();
  const issue = new Date(today.getTime() - Math.floor(Math.random() * 20) * 86400000);
  return {
    id,
    number: `INV-${1000 + Math.floor(Math.random() * 9000)}`,
    vendor: randomFrom(VENDORS),
    currency: randomFrom(CURRENCIES),
    status: randomFrom<InvoiceStatus>(['parsed', 'parsed', 'processing', 'uploaded']),
    issueDate: issue.toISOString().slice(0, 10),
    dueDate: new Date(issue.getTime() + 14 * 86400000).toISOString().slice(0, 10),
    confidence: Math.round((0.72 + Math.random() * 0.26) * 100) / 100,
    subtotal,
    tax,
    total,
    notes: Math.random() > 0.7 ? 'Revisar cargos de transporte.' : undefined,
    originalFileName: `factura-${id}.pdf`,
    originalUrl: '/assets/mock/invoice.pdf',
    lines,
    createdAt: issue.toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

@Injectable({ providedIn: 'root' })
export class FakeBackendService {
  private readonly invoices$ = new BehaviorSubject<InvoiceDto[]>(
    Array.from({ length: 18 }).map((_, i) => buildInvoice(`inv-${i + 1}`))
  );

  listInvoices(filters: InvoiceFilters, pageIndex: number, pageSize: number, sort: { active: keyof InvoiceDto; direction: 'asc' | 'desc' | '' }): Observable<InvoiceListResponse> {
    const data = this.applyFilters(this.invoices$.value, filters);
    const sorted = this.applySort(data, sort);
    const start = pageIndex * pageSize;
    const items = sorted.slice(start, start + pageSize);
    return of({ items, total: sorted.length }).pipe(delay(300));
  }

  getInvoice(id: string): Observable<InvoiceDto> {
    const invoice = this.invoices$.value.find((i) => i.id === id);
    if (!invoice) return throwError(() => new Error('Factura no encontrada'));
    return of(invoice).pipe(delay(200));
  }

  deleteInvoice(id: string): Observable<void> {
    const next = this.invoices$.value.filter((i) => i.id !== id);
    this.invoices$.next(next);
    return of(void 0).pipe(delay(200));
  }

  retryExtraction(id: string): Observable<InvoiceDto> {
    const invoice = this.invoices$.value.find((i) => i.id === id);
    if (!invoice) return throwError(() => new Error('Factura no encontrada'));
    const updated: InvoiceDto = { ...invoice, status: 'processing', updatedAt: new Date().toISOString() };
    this.replaceInvoice(updated);
    return timer(1200).pipe(map(() => {
      const parsed: InvoiceDto = { ...updated, status: 'parsed', updatedAt: new Date().toISOString() };
      this.replaceInvoice(parsed);
      return parsed;
    }));
  }

  registerUpload(fileName: string, size: number, type: string): Observable<InvoiceDto> {
    const id = `inv-${crypto.randomUUID()}`;
    const created = buildInvoice(id, {
      status: 'processing',
      originalFileName: fileName,
      lines: undefined,
      subtotal: 0,
      tax: 0,
      total: 0,
    });
    this.invoices$.next([created, ...this.invoices$.value]);
    return timer(1500).pipe(map(() => {
      const parsed = { ...created, ...buildInvoice(id, { originalFileName: fileName, status: 'parsed' }) };
      this.replaceInvoice(parsed);
      return parsed;
    }));
  }

  getProcessingStatuses(ids: string[]): Observable<InvoiceDto[]> {
    const items = this.invoices$.value.filter((i) => ids.includes(i.id));
    return of(items).pipe(delay(300));
  }

  createCompareJob(invoiceIds: string[]): Observable<CompareJobDto> {
    const job: CompareJobDto = {
      id: `cmp-${crypto.randomUUID()}`,
      invoiceIds,
      status: 'processing',
    };
    return of(job).pipe(delay(400));
  }

  getCompareResult(baselineId: string, invoiceIds: string[]): Observable<CompareResultDto> {
    const invoices = this.invoices$.value.filter((i) => invoiceIds.includes(i.id));
    if (!invoices.length) return throwError(() => new Error('No hay facturas para comparar'));
    const hasLines = invoices.every((i) => i.lines && i.lines.length > 0);
    const currency = invoices[0]?.currency ?? 'EUR';

    const totals = invoices.map((i) => ({
      invoiceId: i.id,
      vendor: i.vendor,
      subtotal: i.subtotal,
      tax: i.tax,
      total: i.total,
    }));

    let lineItems: CompareResultDto['lineItems'] | undefined;
    if (hasLines) {
      const baseline = invoices.find((i) => i.id === baselineId) ?? invoices[0];
      lineItems = (baseline.lines ?? []).map((line) => {
        const byInvoice: Record<string, { unitPrice: number; quantity: number; total: number }> = {};
        for (const invoice of invoices) {
          const match = invoice.lines?.find((l) => l.description === line.description) ?? line;
          byInvoice[invoice.id] = {
            unitPrice: match.unitPrice,
            quantity: match.quantity,
            total: match.total,
          };
        }
        return {
          description: line.description,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          total: line.total,
          byInvoice,
        };
      });
    }

    return of({
      baselineId,
      hasLineItems: hasLines,
      vendors: invoices.map((i) => i.vendor),
      currency,
      totals,
      lineItems,
    }).pipe(delay(600));
  }

  private replaceInvoice(next: InvoiceDto) {
    const list = this.invoices$.value.map((i) => (i.id === next.id ? next : i));
    this.invoices$.next(list);
  }

  private applyFilters(items: InvoiceDto[], filters: InvoiceFilters): InvoiceDto[] {
    return items.filter((i) => {
      if (filters.vendor && !i.vendor.toLowerCase().includes(filters.vendor.toLowerCase())) return false;
      if (filters.status && filters.status !== 'all' && i.status !== filters.status) return false;
      if (filters.currency && i.currency !== filters.currency) return false;
      if (filters.dateFrom && i.issueDate < filters.dateFrom) return false;
      if (filters.dateTo && i.issueDate > filters.dateTo) return false;
      if (filters.totalMin != null && i.total < filters.totalMin) return false;
      if (filters.totalMax != null && i.total > filters.totalMax) return false;
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const haystack = `${i.number} ${i.vendor} ${i.originalFileName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  private applySort(items: InvoiceDto[], sort: { active: keyof InvoiceDto; direction: 'asc' | 'desc' | '' }): InvoiceDto[] {
    if (!sort.direction) return [...items];
    return [...items].sort((a, b) => {
      const left = a[sort.active];
      const right = b[sort.active];
      if (left == null || right == null) return 0;
      if (left < right) return sort.direction === 'asc' ? -1 : 1;
      if (left > right) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
}
