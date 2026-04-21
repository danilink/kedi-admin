import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { InvoiceCompareApiResult } from '../../models/invoice.models';
import { CompareService } from '../../services/compare.service';

type LineRow = {
  itemKey: string;
  invoiceId: string;
  unitPrice: number;
  lineTotal: number;
  unitDiff?: { absDiff: number; percentDiff: number };
  lineDiff?: { absDiff: number; percentDiff: number };
};

@Component({
  selector: 'app-invoice-compare-result',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressBarModule,
    MatChipsModule,
  ],
  template: `
    <div class="container compareResult">
      <div class="pageHeader">
        <div class="pageEyebrow">Facturas</div>
        <div class="pageHeaderTitle">Resultado de comparación</div>
        <div class="pageHeaderSubtitle">Differences de totales y líneas detectadas.</div>
      </div>

      <mat-card class="surfaceCard">
        @if (loading()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }

        @if (error()) {
          <div class="stateBlock error">
            <div>
              <div class="stateTitle">No se pudo cargar la comparación</div>
              <div class="stateSubtitle">{{ error() }}</div>
            </div>
          </div>
        }

        @if (result()) {
          <div class="headerRow">
            <div class="sectionTitle">Totales por factura</div>
            <mat-form-field appearance="outline" class="baselineSelect">
              <mat-label>Baseline</mat-label>
              <mat-select [value]="baselineId()" (selectionChange)="onBaselineChange($event.value)">
                @for (invoice of result()!.invoices; track invoice.id) {
                  <mat-option [value]="invoice.id">{{ invoiceLabel(invoice) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div class="tableWrap">
            <table mat-table [dataSource]="result()!.invoices" class="mat-elevation-z0">
              <ng-container matColumnDef="invoice">
                <th mat-header-cell *matHeaderCellDef>Factura</th>
                <td mat-cell *matCellDef="let row">
                  <div class="vendor">{{ row.supplier_name || 'Proveedor' }}</div>
                  <div class="file">{{ row.invoice_number || row.original_filename }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip [class]="'statusChip ' + statusClass(row.status)">{{ row.status }}</mat-chip>
                </td>
              </ng-container>
              <ng-container matColumnDef="subtotal">
                <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.subtotal ?? 0 | number:'1.2-2' }} {{ row.currency || 'EUR' }}
                  <div class="diff">{{ formatTotalsDiff(row.id, 'subtotal') }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="tax">
                <th mat-header-cell *matHeaderCellDef>IVA</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.tax_total ?? 0 | number:'1.2-2' }} {{ row.currency || 'EUR' }}
                  <div class="diff">{{ formatTotalsDiff(row.id, 'tax_total') }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.total ?? 0 | number:'1.2-2' }} {{ row.currency || 'EUR' }}
                  <div class="diff">{{ formatTotalsDiff(row.id, 'total') }}</div>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="totalsColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: totalsColumns"></tr>
            </table>
          </div>

          @if (result()?.lineItemsCompare?.items?.length) {
            <div class="lineBlock">
              <div class="sectionTitle">Comparación por líneas</div>
              <div class="quality">
                <div>Match: {{ formatPercent(result()!.lineItemsCompare?.quality?.matchRate) }}</div>
                <div>Sin match: {{ result()!.lineItemsCompare?.quality?.unmatchedItems ?? 0 }}</div>
                <div>Confianza: {{ formatPercent(result()!.lineItemsCompare?.quality?.avgConfidence) }}</div>
              </div>
              <div class="tableWrap">
                <table mat-table [dataSource]="lineRows()" class="mat-elevation-z0">
                  <ng-container matColumnDef="item">
                    <th mat-header-cell *matHeaderCellDef>Concepto</th>
                    <td mat-cell *matCellDef="let row">{{ row.itemKey }}</td>
                  </ng-container>
                  <ng-container matColumnDef="invoice">
                    <th mat-header-cell *matHeaderCellDef>Factura</th>
                    <td mat-cell *matCellDef="let row">{{ invoiceName(row.invoiceId) }}</td>
                  </ng-container>
                  <ng-container matColumnDef="unitPrice">
                    <th mat-header-cell *matHeaderCellDef>Precio unidad</th>
                    <td mat-cell *matCellDef="let row">
                      {{ row.unitPrice | number:'1.2-2' }}
                      <div class="diff">{{ formatLineDiff(row.unitDiff) }}</div>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="lineTotal">
                    <th mat-header-cell *matHeaderCellDef>Total línea</th>
                    <td mat-cell *matCellDef="let row">
                      {{ row.lineTotal | number:'1.2-2' }}
                      <div class="diff">{{ formatLineDiff(row.lineDiff) }}</div>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="lineColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: lineColumns"></tr>
                </table>
              </div>
            </div>
          }
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .compareResult { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .headerRow { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
    .baselineSelect { width: min(320px, 100%); }
    .tableWrap { width: 100%; overflow: auto; }
    table { width: 100%; min-width: 760px; }
    .vendor { font-weight: var(--font-weight-medium); }
    .file { font-size: var(--font-size-12); color: var(--color-muted); }
    .diff { font-size: var(--font-size-12); color: var(--color-danger-500); }
    .lineBlock { margin-top: var(--space-4); display: grid; gap: var(--space-2); }
    .quality { display: flex; gap: var(--space-4); flex-wrap: wrap; font-size: var(--font-size-12); color: var(--color-muted); }
    .statusChip { font-weight: var(--font-weight-medium); text-transform: uppercase; }
    .statusChip.uploaded { background: rgba(124, 135, 152, 0.2); color: var(--color-muted); }
    .statusChip.processing { background: rgba(47, 129, 237, 0.15); color: #2f6ad1; }
    .statusChip.parsed { background: rgba(47, 143, 75, 0.15); color: var(--color-success-500); }
    .statusChip.error { background: rgba(179, 38, 30, 0.15); color: var(--color-danger-500); }
  `],
})
export class InvoiceCompareResultPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly compareService = inject(CompareService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly result = signal<InvoiceCompareApiResult | null>(null);
  readonly baselineId = signal<string>('');

  readonly totalsColumns = ['invoice', 'status', 'subtotal', 'tax', 'total'];
  readonly lineColumns = ['item', 'invoice', 'unitPrice', 'lineTotal'];

  readonly lineRows = computed<LineRow[]>(() => {
    const res = this.result();
    if (!res?.lineItemsCompare?.items?.length) return [];
    const rows: LineRow[] = [];
    for (const item of res.lineItemsCompare.items) {
      const entries = Object.entries(item.values ?? {});
      for (const [invoiceId, value] of entries) {
        const diff = item.diffs?.[invoiceId];
        rows.push({
          itemKey: String(item.itemKey ?? ''),
          invoiceId,
          unitPrice: Number((value as any)?.unit_price ?? 0),
          lineTotal: Number((value as any)?.line_total ?? 0),
          unitDiff: diff?.unit_price,
          lineDiff: diff?.line_total,
        });
      }
    }
    return rows;
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const ids = (params.get('ids') || '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
        const baseline = params.get('baseline') || ids[0] || '';
        if (!ids.length) {
          this.error.set('No se recibieron facturas para comparar.');
          this.loading.set(false);
          return;
        }
        this.fetch(ids, baseline);
      });
  }

  onBaselineChange(id: string) {
    const ids = this.result()?.invoices.map((i) => i.id) ?? [];
    if (!ids.length) return;
    this.fetch(ids, id);
  }

  invoiceLabel(invoice: InvoiceCompareApiResult['invoices'][number]) {
    const supplier = invoice.supplier_name || 'Proveedor';
    const number = invoice.invoice_number || invoice.original_filename;
    return `${supplier} · ${number}`;
  }

  invoiceName(id: string) {
    const invoice = this.result()?.invoices.find((i) => i.id === id);
    return invoice ? this.invoiceLabel(invoice) : id;
  }

  formatTotalsDiff(invoiceId: string, key: 'subtotal' | 'tax_total' | 'total') {
    const diff = this.result()?.totalsDiff?.[invoiceId]?.[key];
    if (!diff) return '—';
    const sign = diff.absDiff >= 0 ? '+' : '';
    const pct = Number.isFinite(diff.percentDiff) ? diff.percentDiff : 0;
    return `${sign}${diff.absDiff.toFixed(2)} (${sign}${pct.toFixed(1)}%)`;
  }

  formatLineDiff(diff?: { absDiff: number; percentDiff: number }) {
    if (!diff) return '—';
    const sign = diff.absDiff >= 0 ? '+' : '';
    const pct = Number.isFinite(diff.percentDiff) ? diff.percentDiff : 0;
    return `${sign}${diff.absDiff.toFixed(2)} (${sign}${pct.toFixed(1)}%)`;
  }

  formatPercent(value?: number | null) {
    if (value === null || value === undefined) return '—';
    return `${value.toFixed(1)}%`;
  }

  statusClass(value: string) {
    return String(value || '').toLowerCase();
  }

  private fetch(ids: string[], baseline: string) {
    this.loading.set(true);
    this.error.set('');
    this.compareService.getApiResult(baseline, ids).subscribe({
      next: (res) => {
        this.result.set(res);
        this.baselineId.set(res?.baselineId || baseline);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.message ?? 'Error desconocido');
        this.snackBar.open('No se pudo cargar la comparación.', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
