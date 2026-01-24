import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { InvoiceDto, InvoiceFilters, InvoiceListResponse } from '../models/invoice.models';
import { FakeBackendService } from './fake-backend.service';

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  constructor(private readonly backend: FakeBackendService) {}

  list(filters: InvoiceFilters, pageIndex: number, pageSize: number, sort: { active: keyof InvoiceDto; direction: 'asc' | 'desc' | '' }): Observable<InvoiceListResponse> {
    return this.backend.listInvoices(filters, pageIndex, pageSize, sort);
  }

  getById(id: string): Observable<InvoiceDto> {
    return this.backend.getInvoice(id);
  }

  delete(id: string): Observable<void> {
    return this.backend.deleteInvoice(id);
  }

  retryExtraction(id: string): Observable<InvoiceDto> {
    return this.backend.retryExtraction(id);
  }

  getStatuses(ids: string[]): Observable<InvoiceDto[]> {
    return this.backend.getProcessingStatuses(ids);
  }
}
