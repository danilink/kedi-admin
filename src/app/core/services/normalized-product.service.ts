import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { apiUrl } from '../api-client';
import { NormalizedProduct, InvoiceLineProductMap } from '../models/invoice.models';

const USE_MOCKS = false;

@Injectable({ providedIn: 'root' })
export class NormalizedProductService {
  constructor(private readonly http: HttpClient) {}

  listNormalized(supplierId?: string | null): Observable<NormalizedProduct[]> {
    if (USE_MOCKS) return of(buildMockProducts()).pipe(delay(200));
    let params = new HttpParams();
    if (supplierId) params = params.set('supplierId', supplierId);
    return this.http.get<any[]>(apiUrl('/products/normalized'), { params }).pipe(
      map((items) => items.map(mapProduct))
    );
  }

  createNormalized(supplierId: string | null, canonicalName: string, canonicalSku?: string | null): Observable<NormalizedProduct> {
    if (USE_MOCKS) {
      return of({
        id: `prod-${Math.random().toString(36).slice(2, 8)}`,
        supplierId,
        canonicalName,
        canonicalSku: canonicalSku ?? null,
        createdAt: new Date().toISOString(),
      }).pipe(delay(200));
    }

    return this.http.post<any>(apiUrl('/products/normalized'), {
      supplierId,
      canonical_name: canonicalName,
      canonical_sku: canonicalSku ?? null,
    }).pipe(map(mapProduct));
  }

  mapLine(lineId: string, normalizedProductId: string, method: 'manual' | 'suggested' | 'auto' = 'manual'): Observable<InvoiceLineProductMap> {
    if (USE_MOCKS) {
      return of({
        id: `map-${Math.random().toString(36).slice(2, 8)}`,
        lineId,
        normalizedProductId,
        method,
        createdAt: new Date().toISOString(),
      }).pipe(delay(200));
    }

    return this.http.post<any>(apiUrl(`/products/invoice-lines/${lineId}/map-normalized-product`), {
      normalizedProductId,
      method,
    }).pipe(map((raw) => ({
      id: String(raw?.id ?? ''),
      lineId,
      normalizedProductId,
      method,
      createdAt: String(raw?.created_at ?? new Date().toISOString()),
    })));
  }
}

function mapProduct(raw: any): NormalizedProduct {
  return {
    id: String(raw?.id ?? ''),
    supplierId: raw?.supplierId ?? raw?.supplier_id ?? null,
    canonicalName: String(raw?.canonical_name ?? raw?.canonicalName ?? ''),
    canonicalSku: raw?.canonical_sku ?? raw?.canonicalSku ?? null,
    createdAt: raw?.created_at ?? raw?.createdAt ?? null,
  };
}

function buildMockProducts(): NormalizedProduct[] {
  return [
    { id: 'prod-1', supplierId: 'sup-1', canonicalName: 'Aceite oliva 5L', canonicalSku: 'A-OLI-5L', createdAt: '2024-11-01T10:00:00Z' },
    { id: 'prod-2', supplierId: 'sup-1', canonicalName: 'Arroz bomba 1kg', canonicalSku: 'AR-BOM-1', createdAt: '2024-11-01T10:05:00Z' },
  ];
}
