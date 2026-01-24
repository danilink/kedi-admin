import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CompareJobDto, CompareResultDto } from '../models/invoice.models';
import { FakeBackendService } from './fake-backend.service';

@Injectable({ providedIn: 'root' })
export class CompareService {
  constructor(private readonly backend: FakeBackendService) {}

  createJob(invoiceIds: string[]): Observable<CompareJobDto> {
    return this.backend.createCompareJob(invoiceIds);
  }

  getResult(baselineId: string, invoiceIds: string[]): Observable<CompareResultDto> {
    return this.backend.getCompareResult(baselineId, invoiceIds);
  }
}
