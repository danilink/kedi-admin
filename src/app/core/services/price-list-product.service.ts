import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { apiUrl } from '../api-client';
import {
  CreateProductPayload,
  DeleteProductResponse,
  ListProductsParams,
  PriceListProduct,
  UpdateProductPayload,
} from '../models/price-list-product.models';

@Injectable({ providedIn: 'root' })
export class PriceListProductService {
  constructor(private readonly http: HttpClient) {}

  createProduct(payload: CreateProductPayload): Observable<PriceListProduct> {
    return this.http.post<PriceListProduct>(apiUrl('/price-list-products'), payload);
  }

  listProducts(params: ListProductsParams = {}): Observable<PriceListProduct[]> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('page_size', String(params.page_size ?? 50));

    if (params.q?.trim()) {
      httpParams = httpParams.set('q', params.q.trim());
    }

    return this.http.get<PriceListProduct[]>(apiUrl('/price-list-products'), { params: httpParams });
  }

  getProductById(id: string): Observable<PriceListProduct> {
    return this.http.get<PriceListProduct>(apiUrl(`/price-list-products/${id}`));
  }

  updateProduct(id: string, payload: UpdateProductPayload): Observable<PriceListProduct> {
    return this.http.patch<PriceListProduct>(apiUrl(`/price-list-products/${id}`), payload);
  }

  deleteProduct(id: string): Observable<DeleteProductResponse> {
    return this.http.delete<DeleteProductResponse>(apiUrl(`/price-list-products/${id}`));
  }
}
