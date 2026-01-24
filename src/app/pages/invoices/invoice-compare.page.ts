import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CompareResultDto, InvoiceDto, UploadItemDto } from '../../models/invoice.models';
import { UploadService } from '../../services/upload.service';
import { InvoicesService } from '../../services/invoices.service';
import { CompareService } from '../../services/compare.service';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 15 * 1024 * 1024;

@Component({
  selector: 'app-invoice-compare',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatProgressBarModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
  ],
  template: `
    <div class="container compare">
      <div class="pageHeader">
        <div class="pageEyebrow">Facturas</div>
        <div class="pageHeaderTitle">Comparador de facturas</div>
        <div class="pageHeaderSubtitle">Sube varias facturas y compara diferencias.</div>
      </div>

      <mat-card class="surfaceCard">
        <mat-stepper [linear]="false" class="wizard">
          <mat-step label="Subida">
            <div class="stepBlock">
              <div
                class="dropZone"
                role="button"
                tabindex="0"
                aria-label="Zona de subida de facturas"
                (drop)="onDrop($event)"
                (dragover)="onDragOver($event)"
                (keydown.enter)="openFilePicker()"
                (keydown.space)="openFilePicker()"
              >
                <mat-icon>cloud_upload</mat-icon>
                <div>
                  <div class="dropTitle">Arrastra y suelta PDFs o imágenes</div>
                  <div class="dropSub">Máx. 15MB por archivo. PDF/JPG/PNG.</div>
                </div>
                <label class="uploadBtn" mat-raised-button color="primary">
                  <input #fileInput type="file" multiple (change)="onFileSelected($event)" accept=".pdf,.jpg,.jpeg,.png" />
                  Seleccionar archivos
                </label>
              </div>

              <div class="uploadList" *ngIf="uploads().length">
                @for (item of uploads(); track item.id) {
                  <div class="uploadItem">
                    <div>
                      <div class="uploadName">{{ item.name }}</div>
                      <div class="uploadMeta">{{ item.size / 1024 | number:'1.0-0' }} KB · {{ item.type || 'archivo' }}</div>
                    </div>
                    <div class="uploadStatus">
                      <mat-progress-bar [value]="item.progress" mode="determinate"></mat-progress-bar>
                      <span class="statusText">{{ item.status }}</span>
                    </div>
                    <button mat-icon-button (click)="cancel(item)" [disabled]="item.status === 'uploaded'">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                }
              </div>

              <div class="stepActions">
                <button mat-raised-button color="primary" (click)="goToProcessing()" [disabled]="!canProceedToProcessing()">Continuar</button>
              </div>
            </div>
          </mat-step>

          <mat-step label="Procesamiento">
            <div class="stepBlock">
              <div class="statusHeader">
                <div>
                  <div class="sectionTitle">Extracción OCR y parsing</div>
                  <div class="sectionSubtitle">Esperando a que todas estén procesadas.</div>
                </div>
                <button mat-stroked-button (click)="refreshStatuses()">Actualizar</button>
              </div>

              <div class="statusList" *ngIf="processingInvoices().length">
                @for (invoice of processingInvoices(); track invoice.id) {
                  <div class="statusItem">
                    <div>
                      <div class="statusTitle">{{ invoice.vendor }}</div>
                      <div class="statusSub">{{ invoice.number }} · {{ invoice.originalFileName }}</div>
                    </div>
                    <div class="statusActions">
                      <mat-chip [class]="'statusChip ' + invoice.status">{{ invoice.status }}</mat-chip>
                      @if (invoice.status === 'processing' || invoice.status === 'uploaded') {
                        <button mat-stroked-button (click)="markFailed(invoice.id)">Marcar fallida</button>
                      }
                    </div>
                  </div>
                }
              </div>

              <div class="stepActions">
                <button mat-stroked-button (click)="backToUpload()">Atrás</button>
                <button mat-raised-button color="primary" (click)="goToCompare()" [disabled]="!canProceedToCompare()">Comparar</button>
              </div>
            </div>
          </mat-step>

          <mat-step label="Comparación">
            <div class="stepBlock">
              <div class="statusHeader">
                <div>
                  <div class="sectionTitle">Resultados de comparación</div>
                  <div class="sectionSubtitle">
                    {{ compareResult()?.hasLineItems ? 'Comparación por líneas y totales.' : 'Comparación por totales.' }}
                  </div>
                </div>
                <button mat-stroked-button (click)="exportCsv()" [disabled]="!compareResult()">Exportar CSV</button>
              </div>

              <div class="baselineSelect" *ngIf="compareResult()">
                <mat-form-field appearance="outline">
                  <mat-label>Factura de referencia</mat-label>
                  <mat-select [value]="baselineId()" (selectionChange)="onBaselineChange($event.value)">
                    @for (invoice of processingInvoices(); track invoice.id) {
                      <mat-option [value]="invoice.id">{{ invoice.vendor }} · {{ invoice.number }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              @if (compareResult()) {
                <div class="tableWrap">
                  <table mat-table [dataSource]="compareResult()!.totals" class="mat-elevation-z0">
                    <ng-container matColumnDef="vendor">
                      <th mat-header-cell *matHeaderCellDef>Proveedor</th>
                      <td mat-cell *matCellDef="let row">{{ row.vendor }}</td>
                    </ng-container>
                    <ng-container matColumnDef="subtotal">
                      <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                      <td mat-cell *matCellDef="let row" [class.diff]="isDiff(row.invoiceId)">
                        {{ row.subtotal | number:'1.2-2' }}
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="tax">
                      <th mat-header-cell *matHeaderCellDef>IVA</th>
                      <td mat-cell *matCellDef="let row" [class.diff]="isDiff(row.invoiceId)">
                        {{ row.tax | number:'1.2-2' }}
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="total">
                      <th mat-header-cell *matHeaderCellDef>Total</th>
                      <td mat-cell *matCellDef="let row" [class.diff]="isDiff(row.invoiceId)">
                        {{ row.total | number:'1.2-2' }} {{ compareResult()!.currency }}
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="delta">
                      <th mat-header-cell *matHeaderCellDef>Δ vs. baseline</th>
                      <td mat-cell *matCellDef="let row">
                        {{ diffAmount(row.invoiceId, row.total) }}
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="totalColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: totalColumns"></tr>
                  </table>
                </div>
              }

              <div class="lineBlock" *ngIf="compareResult()?.hasLineItems">
                <div class="sectionTitle">Comparación por líneas</div>
                <div class="tableWrap">
                  <table mat-table [dataSource]="compareResult()!.lineItems" class="mat-elevation-z0">
                    <ng-container matColumnDef="description">
                      <th mat-header-cell *matHeaderCellDef>Concepto</th>
                      <td mat-cell *matCellDef="let row">{{ row.description }}</td>
                    </ng-container>
                    <ng-container matColumnDef="baseline">
                      <th mat-header-cell *matHeaderCellDef>Baseline</th>
                      <td mat-cell *matCellDef="let row">{{ row.byInvoice[baselineId()]?.total | number:'1.2-2' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="variation">
                      <th mat-header-cell *matHeaderCellDef>Variación</th>
                      <td mat-cell *matCellDef="let row" class="diff">
                        {{ lineDiff(row) }}
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="lineColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: lineColumns"></tr>
                  </table>
                </div>
              </div>
            </div>
          </mat-step>
        </mat-stepper>
      </mat-card>
    </div>
  `,
  styles: [`
    .compare { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .wizard { background: transparent; }
    .stepBlock { display: grid; gap: var(--space-4); padding: var(--space-2) 0; }
    .dropZone {
      border: 2px dashed var(--color-border-strong);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      display: grid;
      gap: var(--space-2);
      text-align: center;
      place-items: center;
      background: var(--color-surface-2);
    }
    .dropZone mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .dropTitle { font-weight: var(--font-weight-bold); }
    .dropSub { color: var(--color-muted); font-size: var(--font-size-12); }
    .uploadBtn input { display: none; }
    .uploadList { display: grid; gap: var(--space-2); }
    .uploadItem {
      display: grid;
      grid-template-columns: 1fr 200px auto;
      gap: var(--space-3);
      align-items: center;
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
    }
    .uploadName { font-weight: var(--font-weight-medium); }
    .uploadMeta { font-size: var(--font-size-12); color: var(--color-muted); }
    .uploadStatus { display: grid; gap: 4px; }
    .statusText { font-size: var(--font-size-12); color: var(--color-muted); text-transform: capitalize; }
    .stepActions { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); }
    .statusHeader { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); }
    .statusList { display: grid; gap: var(--space-2); }
    .statusItem { display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-3); background: var(--color-surface); gap: var(--space-3); }
    .statusTitle { font-weight: var(--font-weight-medium); }
    .statusSub { font-size: var(--font-size-12); color: var(--color-muted); }
    .statusActions { display: inline-flex; align-items: center; gap: var(--space-2); }
    .tableWrap { width: 100%; overflow: auto; }
    table { width: 100%; min-width: 620px; }
    .diff { color: var(--color-danger-500); font-weight: var(--font-weight-medium); }
    .baselineSelect { max-width: 360px; }
    .lineBlock { display: grid; gap: var(--space-2); }
    .statusChip { font-weight: var(--font-weight-medium); text-transform: capitalize; }
    .statusChip.uploaded { background: rgba(124, 135, 152, 0.2); color: var(--color-muted); }
    .statusChip.processing { background: rgba(47, 129, 237, 0.15); color: #2f6ad1; }
    .statusChip.parsed { background: rgba(47, 143, 75, 0.15); color: var(--color-success-500); }
    .statusChip.error { background: rgba(179, 38, 30, 0.15); color: var(--color-danger-500); }

    @media (max-width: 768px) {
      .uploadItem { grid-template-columns: 1fr; }
      .statusHeader { flex-direction: column; align-items: flex-start; }
    }
  `],
})
export class InvoiceCompareWizardComponent {
  private readonly uploadService = inject(UploadService);
  private readonly invoicesService = inject(InvoicesService);
  private readonly compareService = inject(CompareService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly uploads = signal<UploadItemDto[]>([]);
  readonly processingInvoices = signal<InvoiceDto[]>([]);
  readonly compareResult = signal<CompareResultDto | null>(null);
  readonly baselineId = signal<string>('');

  readonly totalColumns = ['vendor', 'subtotal', 'tax', 'total', 'delta'];
  readonly lineColumns = ['description', 'baseline', 'variation'];

  private pollingTimer: number | null = null;
  private pollingDelay = 2000;

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.handleFiles(files);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.handleFiles(files);
    input.value = '';
  }

  openFilePicker() {
    this.fileInput?.nativeElement.click();
  }

  cancel(item: UploadItemDto) {
    this.uploadService.cancelUpload(item.id);
    this.updateUpload(item.id, { status: 'canceled', progress: item.progress });
  }

  canProceedToProcessing() {
    return this.uploads().some((u) => u.status === 'uploaded');
  }

  goToProcessing() {
    this.refreshStatuses();
    this.startPolling();
  }

  backToUpload() {
    this.stopPolling();
  }

  canProceedToCompare() {
    const statuses = this.processingInvoices();
    return statuses.length > 0 && statuses.every((s) => s.status === 'parsed' || s.status === 'error');
  }

  goToCompare() {
    this.stopPolling();
    const ids = this.processingInvoices().map((i) => i.id);
    const baseline = this.baselineId() || ids[0];
    if (!baseline) return;
    this.baselineId.set(baseline);
    this.compareService.getResult(baseline, ids).subscribe({
      next: (res) => this.compareResult.set(res),
      error: (err) => this.snackBar.open(err?.message ?? 'No se pudo comparar.', 'Cerrar', { duration: 3000 }),
    });
  }

  onBaselineChange(id: string) {
    this.baselineId.set(id);
    const ids = this.processingInvoices().map((i) => i.id);
    this.compareService.getResult(id, ids).subscribe({
      next: (res) => this.compareResult.set(res),
      error: (err) => this.snackBar.open(err?.message ?? 'No se pudo comparar.', 'Cerrar', { duration: 3000 }),
    });
  }

  refreshStatuses() {
    const ids = this.uploads()
      .map((u) => u.invoiceId)
      .filter((id): id is string => !!id);
    if (!ids.length) return;
    this.invoicesService.getStatuses(ids).subscribe({
      next: (items) => {
        this.processingInvoices.set(items);
        if (!this.baselineId() && items[0]) this.baselineId.set(items[0].id);
        if (items.every((i) => i.status === 'parsed' || i.status === 'error')) {
          this.stopPolling();
        }
      },
      error: () => this.snackBar.open('No se pudieron cargar estados.', 'Cerrar', { duration: 2500 }),
    });
  }

  exportCsv() {
    const result = this.compareResult();
    if (!result) return;
    const rows = [
      ['Proveedor', 'Subtotal', 'IVA', 'Total'],
      ...result.totals.map((t) => [t.vendor, t.subtotal.toString(), t.tax.toString(), t.total.toString()]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comparacion-facturas.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  isDiff(invoiceId: string) {
    return invoiceId !== this.baselineId();
  }

  diffAmount(invoiceId: string, total: number) {
    const base = this.compareResult()?.totals.find((t) => t.invoiceId === this.baselineId());
    if (!base) return '-';
    const diff = total - base.total;
    const pct = base.total ? (diff / base.total) * 100 : 0;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(2)} (${sign}${pct.toFixed(1)}%)`;
  }

  lineDiff(line: NonNullable<CompareResultDto['lineItems']>[number]) {
    const base = line.byInvoice[this.baselineId()]?.total ?? 0;
    const values = Object.values(line.byInvoice);
    const avg = values.reduce((acc, v) => acc + v.total, 0) / values.length;
    const diff = avg - base;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(2)}`;
  }

  private handleFiles(files: File[]) {
    const valid = files.filter((f) => this.validateFile(f));
    for (const file of valid) {
      this.uploadService.createUpload(file)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((item) => {
          this.upsertUpload(item);
        });
    }
  }

  private validateFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.snackBar.open(`Tipo no permitido: ${file.name}`, 'Cerrar', { duration: 3000 });
      return false;
    }
    if (file.size > MAX_SIZE) {
      this.snackBar.open(`Archivo demasiado grande: ${file.name}`, 'Cerrar', { duration: 3000 });
      return false;
    }
    return true;
  }

  private upsertUpload(item: UploadItemDto) {
    const list = [...this.uploads()];
    const index = list.findIndex((u) => u.id === item.id);
    if (index >= 0) list[index] = { ...list[index], ...item };
    else list.unshift(item);
    this.uploads.set(list);
  }

  private updateUpload(id: string, patch: Partial<UploadItemDto>) {
    const list = this.uploads().map((u) => (u.id === id ? { ...u, ...patch } : u));
    this.uploads.set(list);
  }

  private startPolling() {
    this.stopPolling();
    this.pollingDelay = 2000;
    const tick = () => {
      this.refreshStatuses();
      this.pollingDelay = Math.min(5000, Math.round(this.pollingDelay * 1.3));
      this.pollingTimer = window.setTimeout(tick, this.pollingDelay);
    };
    this.pollingTimer = window.setTimeout(tick, this.pollingDelay);
  }

  private stopPolling() {
    if (this.pollingTimer) window.clearTimeout(this.pollingTimer);
    this.pollingTimer = null;
  }

  markFailed(id: string) {
    const list = this.processingInvoices().map((invoice) => (
      invoice.id === id ? { ...invoice, status: 'error' as const } : invoice
    ));
    this.processingInvoices.set(list);
  }
}
