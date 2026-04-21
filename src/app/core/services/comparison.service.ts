import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { apiUrl } from '../api-client';
import { ComparisonRun, ComparisonProductResult } from '../models/invoice.models';

const USE_MOCKS = false;

@Injectable({ providedIn: 'root' })
export class ComparisonService {
  constructor(private readonly http: HttpClient) {}

  listComparisons(page = 1, pageSize = 20): Observable<ComparisonRun[]> {
    if (USE_MOCKS) return of(buildMockRuns()).pipe(delay(200));
    return this.http.get<any[]>(apiUrl(`/comparisons?page=${page}&page_size=${pageSize}`)).pipe(
      map((items) => items.map(mapRun))
    );
  }

  createComparison(payload: { invoiceIds: string[]; params?: Record<string, any> }): Observable<ComparisonRun> {
    if (USE_MOCKS) {
      return of({
        id: `cmp-${Math.random().toString(36).slice(2, 8)}`,
        name: 'Comparación',
        status: 'pending',
        invoiceIds: payload.invoiceIds,
        params: payload.params ?? null,
        startedAt: null,
        finishedAt: null,
        createdAt: new Date().toISOString(),
      } as ComparisonRun).pipe(delay(300));
    }
    return this.http.post<any>(apiUrl('/comparisons'), payload).pipe(map(mapRun));
  }

  runComparison(id: string): Observable<ComparisonRun> {
    if (USE_MOCKS) {
      return of({
        id,
        name: 'Comparacion demo',
        status: 'done',
        params: { currency: 'EUR' },
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      } as ComparisonRun).pipe(delay(200));
    }
    return this.http.post<any>(apiUrl(`/comparisons/${id}/run`), {}).pipe(map(mapRun));
  }

  getComparison(id: string): Observable<ComparisonRun> {
    if (USE_MOCKS) return of(buildMockRuns()[0]).pipe(delay(200));
    return this.http.get<any>(apiUrl(`/comparisons/${id}`)).pipe(map(mapRun));
  }

  deleteComparison(id: string): Observable<void> {
    if (USE_MOCKS) return of(void 0).pipe(delay(200));
    return this.http.delete<void>(apiUrl(`/comparisons/${id}`));
  }
}

function mapRun(raw: any): ComparisonRun {
  const statusRaw = String(raw?.status ?? 'pending').toLowerCase();
  const status = (['pending', 'running', 'done', 'failed'] as const).includes(statusRaw as any)
    ? (statusRaw as ComparisonRun['status'])
    : 'pending';
  return {
    id: String(raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    status,
    invoiceIds: raw?.invoiceIds ?? raw?.invoice_ids ?? [],
    invoiceCount: raw?.invoiceCount ?? raw?.invoice_count ?? null,
    params: raw?.params ?? null,
    startedAt: raw?.startedAt ?? raw?.started_at ?? null,
    finishedAt: raw?.finishedAt ?? raw?.finished_at ?? null,
    createdAt: raw?.created_at ?? raw?.createdAt ?? null,
    updatedAt: raw?.updated_at ?? raw?.updatedAt ?? null,
    errorMessage: raw?.error ?? raw?.error_message ?? raw?.errorMessage ?? null,
    results: Array.isArray(raw?.results) ? raw.results.map(mapResult) : undefined,
  };
}

function mapResult(raw: any): ComparisonProductResult {
  return {
    id: String(raw?.id ?? ''),
    normalizedProductId: raw?.normalizedProductId ?? raw?.normalized_product_id ?? null,
    productName: raw?.productName ?? raw?.product_name ?? null,
    occurrences: Number(raw?.occurrences ?? 0),
    minUnitPrice: typeof raw?.minUnitPrice === 'number' ? raw.minUnitPrice : (typeof raw?.min_unit_price === 'number' ? raw.min_unit_price : null),
    maxUnitPrice: typeof raw?.maxUnitPrice === 'number' ? raw.maxUnitPrice : (typeof raw?.max_unit_price === 'number' ? raw.max_unit_price : null),
    avgUnitPrice: typeof raw?.avgUnitPrice === 'number' ? raw.avgUnitPrice : (typeof raw?.avg_unit_price === 'number' ? raw.avg_unit_price : null),
    lastUnitPrice: typeof raw?.lastUnitPrice === 'number' ? raw.lastUnitPrice : (typeof raw?.last_unit_price === 'number' ? raw.last_unit_price : null),
    currency: raw?.currency ?? null,
    sampleInvoiceLineIds: raw?.sampleInvoiceLineIds ?? raw?.sample_invoice_line_ids ?? [],
    normalized: !!raw?.normalizedProductId,
    priceIncreased: !!raw?.priceIncreased,
    priceDecreased: !!raw?.priceDecreased,
  };
}

function buildMockRuns(): ComparisonRun[] {
  return [
    {
      id: 'cmp-1',
      name: 'Aceites Q4',
      status: 'done',
      invoiceIds: ['inv-1', 'inv-2', 'inv-3'],
      params: { currency: 'EUR' },
      startedAt: '2024-11-09T10:01:00Z',
      finishedAt: '2024-11-09T10:03:00Z',
      createdAt: '2024-11-09T10:00:00Z',
      updatedAt: '2024-11-09T10:03:00Z',
    },
  ];
}
