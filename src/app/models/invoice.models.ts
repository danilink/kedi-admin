export type InvoiceStatus = 'uploaded' | 'processing' | 'parsed' | 'error';

export interface InvoiceLineDto {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  total: number;
}

export interface InvoiceDto {
  id: string;
  number: string;
  vendor: string;
  currency: string;
  status: InvoiceStatus;
  issueDate: string; // ISO date
  dueDate?: string; // ISO date
  confidence?: number; // 0-1
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  originalFileName: string;
  originalUrl?: string;
  lines?: InvoiceLineDto[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface InvoiceFilters {
  vendor?: string;
  status?: InvoiceStatus | 'all';
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  totalMin?: number | null;
  totalMax?: number | null;
  currency?: string;
  query?: string;
}

export interface InvoiceListResponse {
  items: InvoiceDto[];
  total: number;
}

export interface UploadItemDto {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'queued' | 'uploading' | 'uploaded' | 'error' | 'canceled';
  error?: string;
  warnings?: string[];
  invoiceId?: string;
}

export interface CompareJobDto {
  id: string;
  invoiceIds: string[];
  status: 'queued' | 'processing' | 'ready' | 'error';
  errors?: string[];
}

export interface CompareResultDto {
  baselineId: string;
  hasLineItems: boolean;
  vendors: string[];
  currency: string;
  totals: Array<{
    invoiceId: string;
    vendor: string;
    subtotal: number;
    tax: number;
    total: number;
  }>;
  lineItems?: Array<{
    description: string;
    unitPrice: number;
    quantity: number;
    total: number;
    byInvoice: Record<string, { unitPrice: number; quantity: number; total: number }>;
  }>;
}

export type InvoiceCompareTotalsDiff = Record<
  string,
  {
    subtotal?: { absDiff: number; percentDiff: number };
    tax_total?: { absDiff: number; percentDiff: number };
    total?: { absDiff: number; percentDiff: number };
  }
>;

export type InvoiceCompareLineItemDiff = {
  unit_price?: { absDiff: number; percentDiff: number };
  line_total?: { absDiff: number; percentDiff: number };
};

export interface InvoiceCompareApiResult {
  invoices: Array<{
    id: string;
    original_filename: string;
    status: string;
    supplier_name: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    currency: string | null;
    subtotal: number | null;
    tax_total: number | null;
    total: number | null;
    extraction_confidence: number | null;
    error_message: string | null;
    created_at: string;
  }>;
  baselineId: string;
  totalsDiff: InvoiceCompareTotalsDiff;
  lineItemsCompare?: {
    items: Array<{
      itemKey: string;
      values: Record<string, { unit_price: number; line_total: number }>;
      diffs?: Record<string, InvoiceCompareLineItemDiff>;
    }>;
    quality?: {
      matchRate: number;
      unmatchedItems: number;
      avgConfidence: number;
    };
  };
}
