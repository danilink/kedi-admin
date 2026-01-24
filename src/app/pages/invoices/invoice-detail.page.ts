import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { InvoiceDto } from '../../models/invoice.models';
import { InvoicesService } from '../../services/invoices.service';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatProgressBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="container detail">
      <div class="pageHeader">
        <div class="pageEyebrow">Facturas</div>
        <div class="pageHeaderTitle">Detalle de factura</div>
        <div class="pageHeaderSubtitle">Metadatos extraídos y líneas detectadas.</div>
      </div>

      <div class="actions">
        <a mat-stroked-button routerLink="/invoices">
          <mat-icon>arrow_back</mat-icon>
          Volver al listado
        </a>
        @if (invoice()) {
          <button mat-stroked-button (click)="download()" [disabled]="!invoice()?.originalUrl">
            <mat-icon>download</mat-icon>
            Descargar original
          </button>
          <button mat-stroked-button (click)="reprocess()">
            <mat-icon>refresh</mat-icon>
            Reprocesar
          </button>
          <button mat-stroked-button color="warn" (click)="confirmDelete()">
            <mat-icon>delete</mat-icon>
            Eliminar
          </button>
        }
      </div>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      @if (error()) {
        <mat-card class="surfaceCard stateCard">
          <mat-icon>error</mat-icon>
          <div>
            <div class="stateTitle">No se pudo cargar la factura</div>
            <div class="stateSubtitle">{{ error() }}</div>
          </div>
        </mat-card>
      }

      @if (invoice()) {
        <mat-card class="surfaceCard">
          <div class="detailHeader">
            <div>
              <div class="detailTitle">{{ invoice()?.vendor }}</div>
              <div class="detailSub">Factura {{ invoice()?.number }}</div>
            </div>
            <mat-chip [class]="'statusChip ' + invoice()?.status">{{ invoice()?.status }}</mat-chip>
          </div>

          <div class="metaGrid row g-3">
            <div class="col-12 col-md-3">
              <div class="metaLabel">Fecha</div>
              <div class="metaValue">{{ invoice()?.issueDate | date:'dd/MM/yyyy' }}</div>
            </div>
            <div class="col-12 col-md-3">
              <div class="metaLabel">Vencimiento</div>
              <div class="metaValue">{{ invoice()?.dueDate | date:'dd/MM/yyyy' }}</div>
            </div>
            <div class="col-12 col-md-3">
              <div class="metaLabel">Moneda</div>
              <div class="metaValue">{{ invoice()?.currency }}</div>
            </div>
            <div class="col-12 col-md-3">
              <div class="metaLabel">Subtotal</div>
              <div class="metaValue">{{ invoice()?.subtotal | number:'1.2-2' }}</div>
            </div>
            <div class="col-12 col-md-3">
              <div class="metaLabel">IVA</div>
              <div class="metaValue">{{ invoice()?.tax | number:'1.2-2' }}</div>
            </div>
            <div class="col-12 col-md-3">
              <div class="metaLabel">Total</div>
              <div class="metaValue">{{ invoice()?.total | number:'1.2-2' }} {{ invoice()?.currency }}</div>
            </div>
            <div class="col-12 col-md-3">
              <div class="metaLabel">Confianza OCR</div>
              <div class="metaValue">{{ invoice()?.confidence ? (invoice()?.confidence! * 100 | number:'1.0-0') + '%' : '—' }}</div>
            </div>
            <div class="col-12 col-md-6">
              <div class="metaLabel">Archivo original</div>
              <div class="metaValue">{{ invoice()?.originalFileName }}</div>
            </div>
          </div>
        </mat-card>

        <mat-card class="surfaceCard">
          <div class="sectionHeader">
            <div>
              <div class="sectionTitle">Líneas detectadas</div>
              <div class="sectionSubtitle">Se muestran si el OCR extrajo conceptos.</div>
            </div>
            @if (!invoice()?.lines?.length) {
              <div class="statusPill is-muted">Sin líneas disponibles</div>
            }
          </div>

          <table mat-table [dataSource]="invoice()?.lines ?? []" class="mat-elevation-z0" *ngIf="invoice()?.lines?.length">
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Concepto</th>
              <td mat-cell *matCellDef="let row">{{ row.description }}</td>
            </ng-container>
            <ng-container matColumnDef="quantity">
              <th mat-header-cell *matHeaderCellDef>Cant.</th>
              <td mat-cell *matCellDef="let row">{{ row.quantity }}</td>
            </ng-container>
            <ng-container matColumnDef="unitPrice">
              <th mat-header-cell *matHeaderCellDef>Precio unitario</th>
              <td mat-cell *matCellDef="let row">{{ row.unitPrice | number:'1.2-2' }}</td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td mat-cell *matCellDef="let row">{{ row.total | number:'1.2-2' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="lineColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: lineColumns"></tr>
          </table>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .detail { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
    .detailHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); }
    .detailTitle { font-size: var(--font-size-20); font-weight: var(--font-weight-bold); }
    .detailSub { color: var(--color-muted); font-size: var(--font-size-12); }
    .metaLabel { font-size: var(--font-size-12); color: var(--color-muted); }
    .metaValue { font-weight: var(--font-weight-medium); }
    .stateCard { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); }
    .stateTitle { font-weight: var(--font-weight-bold); }
    .stateSubtitle { color: var(--color-muted); font-size: var(--font-size-12); }
    .statusChip { font-weight: var(--font-weight-medium); text-transform: capitalize; }
    .statusChip.uploaded { background: rgba(124, 135, 152, 0.2); color: var(--color-muted); }
    .statusChip.processing { background: rgba(47, 129, 237, 0.15); color: #2f6ad1; }
    .statusChip.parsed { background: rgba(47, 143, 75, 0.15); color: var(--color-success-500); }
    .statusChip.error { background: rgba(179, 38, 30, 0.15); color: var(--color-danger-500); }
    table { width: 100%; }
  `],
})
export class InvoiceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly invoices = inject(InvoicesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly invoice = signal<InvoiceDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly lineColumns = ['description', 'quantity', 'unitPrice', 'total'];

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        if (!id) return;
        this.fetch(id);
      });
  }

  private fetch(id: string) {
    this.loading.set(true);
    this.error.set('');
    this.invoices.getById(id).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error desconocido');
        this.loading.set(false);
      },
    });
  }

  download() {
    const url = this.invoice()?.originalUrl;
    if (!url) {
      this.snackBar.open('No hay fichero original disponible.', 'Cerrar', { duration: 2500 });
      return;
    }
    window.open(url, '_blank');
  }

  reprocess() {
    const id = this.invoice()?.id;
    if (!id) return;
    this.invoices.retryExtraction(id).subscribe({
      next: (invoice) => {
        this.invoice.set(invoice);
        this.snackBar.open('Reprocesando factura…', 'Cerrar', { duration: 2500 });
      },
      error: () => this.snackBar.open('No se pudo reprocesar.', 'Cerrar', { duration: 2500 }),
    });
  }

  confirmDelete() {
    const id = this.invoice()?.id;
    if (!id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar factura',
        message: `Se eliminará la factura ${this.invoice()?.number}. Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.invoices.delete(id).subscribe({
        next: () => {
          this.snackBar.open('Factura eliminada.', 'Cerrar', { duration: 2500 });
          this.invoice.set(null);
        },
        error: () => this.snackBar.open('No se pudo eliminar.', 'Cerrar', { duration: 2500 }),
      });
    });
  }
}
