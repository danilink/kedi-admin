import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompareJobDto, CompareResultDto, InvoiceCompareApiResult, InvoiceDto } from '../models/invoice.models';

@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly baseUrl = '/api/invoice-compare';

  constructor(private readonly http: HttpClient) {}

  createJob(invoiceIds: string[], baselineInvoiceId?: string): Observable<CompareJobDto> {
    return this.http.post<CompareJobDto>(this.baseUrl, { invoiceIds, baselineInvoiceId });
  }

  getResult(baselineId: string, invoiceIds: string[]): Observable<CompareResultDto> {
    return this.http.post<any>(this.baseUrl, { baselineInvoiceId: baselineId, invoiceIds }).pipe(
      map((res) => this.mapCompareResult(res))
    );
  }

  getApiResult(baselineInvoiceId: string, invoiceIds: string[]): Observable<InvoiceCompareApiResult> {
    return this.http.post<InvoiceCompareApiResult>(this.baseUrl, { baselineInvoiceId, invoiceIds });
  }

  private mapCompareResult(res: any): CompareResultDto {
    const invoices: InvoiceDto[] = Array.isArray(res?.invoices) ? res.invoices.map((i: any) => this.mapInvoice(i)) : [];
    const currency = invoices.find((invoice) => invoice.currency)?.currency ?? 'EUR';
    const totals = invoices.map((invoice: InvoiceDto) => ({
      invoiceId: invoice.id,
      vendor: invoice.vendor,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
    }));

    const lineItemsRaw = res?.lineItemsCompare?.items ?? [];
    const lineItems = Array.isArray(lineItemsRaw)
      ? lineItemsRaw.map((item: any) => {
        const values = item?.values ?? {};
        const byInvoice: Record<string, { unitPrice: number; quantity: number; total: number }> = {};
        for (const [invoiceId, value] of Object.entries(values)) {
          const v = value as any;
          byInvoice[invoiceId] = {
            unitPrice: Number(v?.unitPrice ?? 0),
            quantity: Number(v?.qty ?? 0),
            total: Number(v?.lineTotal ?? 0),
          };
        }
        const firstTotal = Object.values(byInvoice)[0]?.total ?? 0;
        return {
          description: String(item?.itemKey ?? ''),
          unitPrice: Number(Object.values(byInvoice)[0]?.unitPrice ?? 0),
          quantity: Number(Object.values(byInvoice)[0]?.quantity ?? 0),
          total: Number(firstTotal),
          byInvoice,
        };
      })
      : undefined;

    return {
      baselineId: String(res?.baselineId ?? res?.baseline_id ?? ''),
      hasLineItems: Array.isArray(lineItems) && lineItems.length > 0,
      vendors: invoices.map((invoice) => invoice.vendor),
      currency,
      totals,
      lineItems,
    };
  }

  private mapInvoice(raw: any): InvoiceDto {
    const statusRaw = String(raw?.status ?? '').toLowerCase();
    const status = (['uploaded', 'processing', 'parsed', 'error'] as const).includes(statusRaw as any)
      ? (statusRaw as InvoiceDto['status'])
      : 'processing';

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
      lines: Array.isArray(raw?.lines) ? raw.lines : undefined,
      createdAt: String(raw?.created_at ?? raw?.createdAt ?? ''),
      updatedAt: String(raw?.updated_at ?? raw?.updatedAt ?? raw?.created_at ?? raw?.createdAt ?? ''),
    };
  }
}
