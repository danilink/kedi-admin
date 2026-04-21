import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ComparisonProductResult, ComparisonRun } from '../../../core/models/invoice.models';
import { ComparisonService } from '../../../core/services/comparison.service';

@Component({
  selector: 'app-comparisons-detail-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule],
  template: `
    <div class="container comparisonDetail">
      <div class="pageHeader">
        <div class="pageEyebrow">Comparaciones</div>
        <div class="pageHeaderTitle">Detalle</div>
        <div class="pageHeaderSubtitle">Estado y ejecución.</div>
      </div>

      <mat-card class="surfaceCard" *ngIf="comparison() as cmp">
        <div class="detailHeader">
          <div>
            <div class="detailTitle">{{ cmp.name }}</div>
            <div class="detailSub">#{{ cmp.id }}</div>
          </div>
          <div class="detailActions">
          </div>
        </div>

        <div class="detailGrid">
          <div>
            <div class="metaLabel">Estado</div>
            <div class="metaValue">{{ cmp.status }}</div>
          </div>
          <div>
            <div class="metaLabel">Facturas</div>
            <div class="metaValue">{{ cmp.invoiceCount ?? cmp.invoiceIds?.length ?? 0 }}</div>
          </div>
          <div>
            <div class="metaLabel">Creada</div>
            <div class="metaValue">{{ cmp.startedAt ? (cmp.startedAt | date:'dd/MM/yyyy HH:mm') : '—' }}</div>
          </div>
        </div>

        @if (cmp.status === 'failed') {
          <div class="errorPanel">
            Error: {{ cmp.errorMessage || 'Fallo desconocido' }}
          </div>
        }
      </mat-card>

      @if (results().length) {
        <mat-card class="surfaceCard">
          <div class="sectionTitle">Resultados</div>
          <div class="tableWrap">
            <table mat-table [dataSource]="results()" class="mat-elevation-z0">
              <ng-container matColumnDef="product">
                <th mat-header-cell *matHeaderCellDef>Producto</th>
                <td mat-cell *matCellDef="let row">
                  <div class="productName">{{ row.productName || row.normalizedProductId || row.id }}</div>
                  <div class="productMeta">{{ row.normalizedProductId ? 'Normalizado' : 'Sin normalizar' }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="occ">
                <th mat-header-cell *matHeaderCellDef>Ocurrencias</th>
                <td mat-cell *matCellDef="let row">{{ row.occurrences }}</td>
              </ng-container>
              <ng-container matColumnDef="range">
                <th mat-header-cell *matHeaderCellDef>Min/Max</th>
                <td mat-cell *matCellDef="let row">
                  {{ row.minUnitPrice ?? 0 | number:'1.2-2' }} · {{ row.maxUnitPrice ?? 0 | number:'1.2-2' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="avg">
                <th mat-header-cell *matHeaderCellDef>Promedio</th>
                <td mat-cell *matCellDef="let row">{{ row.avgUnitPrice ?? 0 | number:'1.2-2' }}</td>
              </ng-container>
              <ng-container matColumnDef="last">
                <th mat-header-cell *matHeaderCellDef>Último precio</th>
                <td mat-cell *matCellDef="let row">
                  <span [class.is-up]="row.priceIncreased" [class.is-down]="row.priceDecreased">
                    {{ row.lastUnitPrice ?? 0 | number:'1.2-2' }} {{ row.currency || 'EUR' }}
                  </span>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="resultColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: resultColumns"></tr>
            </table>
          </div>
        </mat-card>
      }

    </div>
  `,
  styles: [`
    .comparisonDetail { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .detailHeader { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
    .detailTitle { font-size: var(--font-size-20); font-weight: var(--font-weight-bold); }
    .detailSub { font-size: var(--font-size-12); color: var(--color-muted); }
    .detailActions { display: flex; gap: 8px; flex-wrap: wrap; }
    .detailGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-2); margin-top: var(--space-3); }
    .metaLabel { font-size: var(--font-size-12); color: var(--color-muted); }
    .metaValue { font-weight: var(--font-weight-medium); }
    .errorPanel { margin-top: var(--space-3); padding: var(--space-2); border-radius: var(--radius-sm); background: rgba(179, 38, 30, 0.1); color: var(--color-danger-500); }
    .tableWrap { width: 100%; overflow: auto; margin-top: var(--space-2); }
    table { width: 100%; min-width: 720px; }
    .productName { font-weight: var(--font-weight-medium); }
    .productMeta { font-size: var(--font-size-12); color: var(--color-muted); }
    .sectionTitle { font-weight: var(--font-weight-bold); }
    .is-up { color: var(--color-danger-500); font-weight: var(--font-weight-medium); }
    .is-down { color: var(--color-success-500); font-weight: var(--font-weight-medium); }
  `],
})
export class ComparisonsDetailPageComponent {
  private readonly service = inject(ComparisonService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly comparison = signal<ComparisonRun | null>(null);
  readonly results = signal<ComparisonProductResult[]>([]);
  readonly resultColumns = ['product', 'occ', 'range', 'avg', 'last'];
  private pollingTimer: number | null = null;

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        if (!id) return;
        this.load(id);
      });
  }

  private load(id: string) {
    this.service.getComparison(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (cmp) => {
        this.comparison.set(cmp);
        this.results.set(cmp.results ?? []);
        if (cmp.status === 'running') this.startPolling(id);
      },
      error: () => this.snackBar.open('No se pudo cargar.', 'Cerrar', { duration: 2500 }),
    });
  }

  private startPolling(id: string) {
    this.stopPolling();
    const tick = () => {
      this.service.getComparison(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (cmp) => {
          this.comparison.set(cmp);
          this.results.set(cmp.results ?? []);
          if (cmp.status === 'done' || cmp.status === 'failed') {
            this.stopPolling();
          }
        },
      });
    };
    this.pollingTimer = window.setInterval(tick, 2500);
  }

  private stopPolling() {
    if (this.pollingTimer) window.clearInterval(this.pollingTimer);
    this.pollingTimer = null;
  }

}
