import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Invoice, InvoiceLine } from '../../../core/models/invoice.models';
import { InvoiceService } from '../../../core/services/invoice.service';

@Component({
  selector: 'app-invoice-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
  ],
  template: `
    <div class="container invoiceDetail">
      <div class="pageHeader">
        <div class="pageEyebrow">Facturas</div>
        <div class="pageHeaderTitle">Detalle de factura</div>
        <div class="pageHeaderSubtitle">Vista clara y compacta de la factura.</div>
      </div>

      @if (invoice()) {
        <mat-card class="surfaceCard headerCard">
          <div class="headerMain">
            <div>
              <div class="title">{{ invoice()!.supplier?.name || 'Proveedor' }}</div>
              <div class="sub">Factura {{ invoice()!.number || '—' }}</div>
            </div>
            <div class="headerMeta">
              <div class="metaItem">
                <div class="metaLabel">Fecha</div>
                <div class="metaValue">{{ invoice()!.issueDate || '—' }}</div>
              </div>
              <div class="metaItem">
                <div class="metaLabel">Estado</div>
                <div class="metaValue">{{ invoice()!.status }}</div>
              </div>
              <div class="metaItem">
                <div class="metaLabel">Total</div>
                <div class="metaValue">{{ invoice()!.total ?? 0 | number:'1.2-2' }} {{ invoice()!.currency || 'EUR' }}</div>
              </div>
            </div>
          </div>

          <div class="headerActions">
            <button mat-stroked-button color="primary" (click)="download()" [disabled]="!canDownload()">
              <mat-icon>download</mat-icon>
              Descargar original
            </button>
            <div class="fileMeta">{{ invoice()!.originalFileName || 'Archivo original' }}</div>
          </div>
        </mat-card>
      }

      @if (invoice() && invoice()!.status === 'error') {
        <mat-card class="surfaceCard errorBanner">
          <mat-icon>error</mat-icon>
          <div>
            <div class="errorTitle">Factura con error</div>
            <div class="errorBody">{{ invoice()!.errorMessage || 'Error no especificado.' }}</div>
          </div>
        </mat-card>
      }

      @if (invoice()) {
        <mat-card class="surfaceCard summaryCard">
          <div class="summaryGrid">
            <div>
              <div class="metaLabel">Subtotal</div>
              <div class="metaValue">{{ invoice()!.subtotal ?? 0 | number:'1.2-2' }}</div>
            </div>
            <div>
              <div class="metaLabel">Impuestos</div>
              <div class="metaValue">{{ invoice()!.taxTotal ?? 0 | number:'1.2-2' }}</div>
            </div>
            <div>
              <div class="metaLabel">Total</div>
              <div class="metaValue">{{ invoice()!.total ?? 0 | number:'1.2-2' }}</div>
            </div>
            <div>
              <div class="metaLabel">Confianza extracción</div>
              <div class="metaValue">{{ formatConfidence(invoice()!.extractionConfidence) }}</div>
            </div>
          </div>
        </mat-card>
      }

      <mat-card class="surfaceCard">
        <div class="tableHeader">
          <div>
            <div class="sectionTitle">Líneas de factura</div>
            <div class="sectionSubtitle">Descripción, cantidades, IVA y códigos.</div>
          </div>
        </div>

        <div class="tableWrap">
          <table mat-table [dataSource]="filteredLines()" class="mat-elevation-z0">
            <ng-container matColumnDef="desc">
              <th mat-header-cell *matHeaderCellDef>Descripción</th>
              <td mat-cell *matCellDef="let row">{{ row.description }}</td>
            </ng-container>
            <ng-container matColumnDef="qty">
              <th mat-header-cell *matHeaderCellDef>Cantidad</th>
              <td mat-cell *matCellDef="let row">{{ row.quantity ?? 0 }}</td>
            </ng-container>
            <ng-container matColumnDef="unit">
              <th mat-header-cell *matHeaderCellDef>Precio unidad</th>
              <td mat-cell *matCellDef="let row">{{ row.unitPrice ?? 0 | number:'1.2-2' }}</td>
            </ng-container>
            <ng-container matColumnDef="tax">
              <th mat-header-cell *matHeaderCellDef>IVA</th>
              <td mat-cell *matCellDef="let row">{{ row.taxRate ?? 0 }}%</td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>Total línea</th>
              <td mat-cell *matCellDef="let row">{{ row.lineTotal ?? 0 | number:'1.2-2' }}</td>
            </ng-container>
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Código producto</th>
              <td mat-cell *matCellDef="let row">{{ row.productCode || '—' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="lineColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: lineColumns"></tr>
          </table>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .invoiceDetail { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .headerCard { position: sticky; top: 72px; z-index: 2; }
    .headerMain { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
    .title { font-size: var(--font-size-20); font-weight: var(--font-weight-bold); }
    .sub { color: var(--color-muted); font-size: var(--font-size-12); }
    .headerMeta { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
    .metaGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-2); margin-top: var(--space-2); }
    .metaLabel { font-size: var(--font-size-12); color: var(--color-muted); }
    .metaValue { font-weight: var(--font-weight-medium); }
    .headerActions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-2); flex-wrap: wrap; }
    .fileMeta { font-size: var(--font-size-12); color: var(--color-muted); }
    .summaryCard { padding: var(--space-3); }
    .summaryGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-2); }
    .errorBanner { display: flex; align-items: flex-start; gap: var(--space-2); border: 1px solid rgba(179, 38, 30, 0.3); background: rgba(179, 38, 30, 0.08); }
    .errorTitle { font-weight: var(--font-weight-bold); }
    .errorBody { font-size: var(--font-size-12); color: var(--color-danger-500); }
    .tableHeader { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
    .tableWrap { width: 100%; overflow: auto; }
    table { width: 100%; min-width: 720px; }
    .sectionTitle { font-weight: var(--font-weight-bold); }
    .sectionSubtitle { font-size: var(--font-size-12); color: var(--color-muted); }
  `],
})
export class InvoiceDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(InvoiceService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly invoice = signal<Invoice | null>(null);
  readonly lines = signal<InvoiceLine[]>([]);

  readonly form = this.fb.group({
    query: [''],
    taxRate: [''],
  });

  readonly lineColumns = ['desc', 'qty', 'unit', 'tax', 'total', 'code'];

  readonly filteredLines = computed(() => {
    const q = (this.form.controls.query.value || '').toLowerCase();
    const rate = Number(this.form.controls.taxRate.value || 0);
    return this.lines().filter((line) => {
      const matchesQuery = !q || line.description.toLowerCase().includes(q);
      const matchesRate = !rate || Number(line.taxRate || 0) === rate;
      return matchesQuery && matchesRate;
    });
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        if (!id) return;
        this.load(id);
      });
  }

  formatConfidence(value?: number | null) {
    if (value === null || value === undefined) return '—';
    return `${(value * 100).toFixed(0)}%`;
  }

  canDownload() {
    return !!this.invoice()?.originalFileName;
  }

  download() {
    const inv = this.invoice();
    if (!inv) return;
    this.service.getFile(inv.id).subscribe({
      next: (res) => {
        const blob = res.body;
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = inv.originalFileName || `factura-${inv.id}.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      },
      error: () => this.snackBar.open('No se pudo descargar.', 'Cerrar', { duration: 2500 }),
    });
  }

  private load(id: string) {
    this.service.getInvoice(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.lines.set(invoice.lineItems ?? []);
      },
      error: () => this.snackBar.open('No se pudo cargar la factura.', 'Cerrar', { duration: 2500 }),
    });
  }
}
