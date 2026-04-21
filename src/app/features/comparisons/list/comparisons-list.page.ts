import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ComparisonRun } from '../../../core/models/invoice.models';
import { ComparisonService } from '../../../core/services/comparison.service';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-comparisons-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatDialogModule],
  template: `
    <div class="container comparisons">
      <div class="pageHeader">
        <div class="pageEyebrow">Comparaciones</div>
        <div class="pageHeaderTitle">Historial</div>
        <div class="pageHeaderSubtitle">Comparaciones creadas y su estado.</div>
      </div>

      <mat-card class="surfaceCard">
        <div class="actionsRow">
          <a mat-raised-button color="primary" routerLink="/comparisons/new">
            <mat-icon>add</mat-icon>
            Nueva comparación
          </a>
        </div>

        @if (loading()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }

        <div class="tableWrap">
          <table mat-table [dataSource]="items()" class="mat-elevation-z0">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let row">
                <span [class]="'statusBadge status-' + row.status">{{ row.status }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="count">
              <th mat-header-cell *matHeaderCellDef># facturas</th>
              <td mat-cell *matCellDef="let row">{{ row.invoiceCount ?? row.invoiceIds?.length ?? 0 }}</td>
            </ng-container>
            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef>Creada</th>
              <td mat-cell *matCellDef="let row">{{ row.startedAt ? (row.startedAt | date:'dd/MM/yyyy') : '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let row">
                <div class="rowActions">
                  <a mat-icon-button [routerLink]="['/comparisons', row.id]" aria-label="Ver detalle">
                    <mat-icon>visibility</mat-icon>
                  </a>
                  <button mat-icon-button color="warn" (click)="confirmDelete(row)" aria-label="Eliminar comparación">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .comparisons { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .actionsRow {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--space-2);
      padding: 10px;
      border-radius: 12px;
      background: linear-gradient(180deg, #f9fcff, #f4f8fe);
      border: 1px solid rgba(194, 208, 229, 0.7);
    }
    .tableWrap { width: 100%; overflow: auto; }
    table { width: 100%; min-width: 640px; }
    .rowActions { display: inline-flex; gap: 6px; }
    .rowActions a {
      color: inherit;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .rowActions mat-icon {
      color: var(--color-primary-600);
      fill: var(--color-primary-600);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .statusBadge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: var(--font-size-11);
      font-weight: var(--font-weight-bold);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .status-pending { background: rgba(39, 94, 142, 0.14); color: var(--color-info-500); }
    .status-running { background: rgba(183, 121, 31, 0.16); color: var(--color-warning-500); }
    .status-done { background: rgba(19, 121, 91, 0.14); color: var(--color-success-500); }
    .status-failed { background: rgba(183, 59, 59, 0.14); color: var(--color-danger-500); }

    @media (max-width: 768px) {
      .actionsRow a { width: 100%; }
      table { min-width: 560px; }
    }
  `],
})
export class ComparisonsListPageComponent {
  private readonly service = inject(ComparisonService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly items = signal<ComparisonRun[]>([]);
  readonly columns = ['name', 'status', 'count', 'created', 'actions'];

  constructor() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.service.listComparisons(1, 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No se pudieron cargar comparaciones.', 'Cerrar', { duration: 2500 });
      },
    });
  }

  confirmDelete(row: ComparisonRun) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar comparación',
        message: `Se eliminará la comparación ${row.name}. Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.service.deleteComparison(row.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.snackBar.open('Comparación eliminada.', 'Cerrar', { duration: 2500 });
          this.load();
        },
        error: () => this.snackBar.open('No se pudo eliminar.', 'Cerrar', { duration: 2500 }),
      });
    });
  }
}
