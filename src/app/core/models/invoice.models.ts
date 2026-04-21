export type Party = {
  id: string;
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type Invoice = {
  id: string;
  number: string | null;
  supplier: Party | null;
  customer?: Party | null;
  currency: string | null;
  status: 'uploaded' | 'processing' | 'parsed' | 'error';
  issueDate: string | null;
  dueDate?: string | null;
  subtotal: number | null;
  taxTotal: number | null;
  total: number | null;
  extractionConfidence?: number | null;
  errorMessage?: string | null;
  contentType?: string | null;
  fileSize?: number | null;
  storageBackend?: string | null;
  originalFileName: string;
  createdAt: string;
  updatedAt?: string | null;
  lineItems?: InvoiceLine[];
};

export type InvoiceLine = {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
  taxRate?: number | null;
  productCode?: string | null;
  confidence?: number | null;
  normalizedProductId?: string | null;
};

export type InvoiceTaxSummary = {
  id: string;
  invoiceId: string;
  taxRate: number | null;
  taxableBase: number | null;
  taxTotal: number | null;
};

export type InvoiceLegalText = {
  invoiceId: string;
  returns?: string | null;
  privacy?: string | null;
  packaging?: string | null;
  registry?: string | null;
};

export type NormalizedProduct = {
  id: string;
  supplierId?: string | null;
  canonicalName: string;
  canonicalSku?: string | null;
  createdAt?: string | null;
};

export type InvoiceLineProductMap = {
  id: string;
  lineId: string;
  normalizedProductId: string;
  method: 'manual' | 'suggested' | 'auto';
  createdAt: string;
};

export type ComparisonRun = {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  invoiceIds?: string[];
  invoiceCount?: number | null;
  params?: Record<string, any> | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  errorMessage?: string | null;
  results?: ComparisonProductResult[];
};

export type ComparisonProductResult = {
  id: string;
  normalizedProductId: string | null;
  occurrences: number;
  minUnitPrice: number | null;
  maxUnitPrice: number | null;
  avgUnitPrice: number | null;
  lastUnitPrice: number | null;
  currency?: string | null;
  sampleInvoiceLineIds: string[];
  normalized?: boolean;
  productName?: string;
  variationAbs?: number | null;
  variationPct?: number | null;
  lastDate?: string | null;
  priceIncreased?: boolean;
  priceDecreased?: boolean;
};
