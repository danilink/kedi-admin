import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { PriceListProduct } from '../../../../core/models/price-list-product.models';

@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    @if (loading) {
      <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    @if (error && !loading) {
      <div class="stateBlock error">
        <mat-icon>error</mat-icon>
        <div>
          <div class="stateTitle">No se pudo cargar el listado</div>
          <div class="stateSubtitle">{{ error }}</div>
        </div>
        <button mat-stroked-button (click)="retry.emit()">Reintentar</button>
      </div>
    }

    @if (!loading && !error && products.length === 0) {
      <div class="stateBlock empty">
        <mat-icon>inbox</mat-icon>
        <div>
          <div class="stateTitle">Sin productos</div>
          <div class="stateSubtitle">No hay registros para los filtros seleccionados.</div>
        </div>
      </div>
    }

    <div class="tableWrap" [class.is-loading]="loading">
      <table mat-table [dataSource]="products" class="mat-elevation-z0">
        <ng-container matColumnDef="cod">
          <th mat-header-cell *matHeaderCellDef>COD</th>
          <td mat-cell *matCellDef="let row">{{ row.cod }}</td>
        </ng-container>

        <ng-container matColumnDef="denominacion">
          <th mat-header-cell *matHeaderCellDef>Denominación</th>
          <td mat-cell *matCellDef="let row">{{ row.denominacion }}</td>
        </ng-container>

        <ng-container matColumnDef="precio">
          <th mat-header-cell *matHeaderCellDef>Precio</th>
          <td mat-cell *matCellDef="let row">{{ row.precio | number:'1.2-2' }}</td>
        </ng-container>

        <ng-container matColumnDef="byWeight">
          <th mat-header-cell *matHeaderCellDef>Por Peso</th>
          <td mat-cell *matCellDef="let row">{{ row.byWeight ? 'Sí' : 'No' }}</td>
        </ng-container>

        <ng-container matColumnDef="insertDate">
          <th mat-header-cell *matHeaderCellDef>Fecha Alta</th>
          <td mat-cell *matCellDef="let row">{{ row.insertDate | date:'dd/MM/yyyy HH:mm' }}</td>
        </ng-container>

        <ng-container matColumnDef="updateDate">
          <th mat-header-cell *matHeaderCellDef>Fecha Actualización</th>
          <td mat-cell *matCellDef="let row">{{ row.updateDate | date:'dd/MM/yyyy HH:mm' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Acciones</th>
          <td mat-cell *matCellDef="let row">
            <div class="rowActions">
              <button mat-icon-button aria-label="Editar producto" (click)="edit.emit(row)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" aria-label="Eliminar producto" (click)="remove.emit(row)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </div>

    <mat-paginator
      [length]="getPaginatorLength()"
      [pageIndex]="getPageIndex()"
      [pageSize]="pageSize"
      [pageSizeOptions]="pageSizeOptions"
      [disabled]="loading"
      showFirstLastButtons
      (page)="onPageChanged($event)"
    ></mat-paginator>
  `,
  styles: [`
    .tableWrap { width: 100%; overflow: auto; }
    .tableWrap.is-loading { opacity: 0.65; pointer-events: none; }
    table { width: 100%; min-width: 980px; }
    .rowActions { display: inline-flex; gap: 2px; }
    .rowActions .mat-mdc-icon-button { color: var(--color-primary-600); }
    td.mat-column-cod, th.mat-column-cod { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace; }
    td.mat-column-precio, th.mat-column-precio { text-align: right; }
    td.mat-column-actions, th.mat-column-actions { text-align: right; }
    .stateBlock {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
      border-radius: var(--radius-md);
      border: 1px dashed var(--color-border-strong);
      margin: var(--space-3) 0;
      background: var(--color-surface-2);
    }
    .stateBlock mat-icon { font-size: 26px; width: 26px; height: 26px; }
    .stateTitle { font-weight: var(--font-weight-bold); }
    .stateSubtitle { color: var(--color-muted); font-size: var(--font-size-12); }

    @media (max-width: 768px) {
      table { min-width: 760px; }
      .stateBlock {
        flex-direction: column;
        align-items: flex-start;
      }
      .stateBlock button {
        width: 100%;
      }
    }
  `],
})
export class ProductTableComponent {
  @Input() products: PriceListProduct[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Input() page = 1;
  @Input() pageSize = 50;
  @Input() hasNextPage = false;

  @Output() pageChange = new EventEmitter<{ page: number; page_size: number }>();
  @Output() edit = new EventEmitter<PriceListProduct>();
  @Output() remove = new EventEmitter<PriceListProduct>();
  @Output() retry = new EventEmitter<void>();

  readonly columns = ['cod', 'denominacion', 'precio', 'byWeight', 'insertDate', 'updateDate', 'actions'];
  readonly pageSizeOptions = [10, 20, 50, 100, 200, 500];

  getPaginatorLength() {
    const loaded = (this.page - 1) * this.pageSize + this.products.length;
    return this.hasNextPage ? loaded + 1 : loaded;
  }

  getPageIndex() {
    return this.page > 1 ? this.page - 1 : 0;
  }

  onPageChanged(event: PageEvent) {
    this.pageChange.emit({ page: event.pageIndex + 1, page_size: event.pageSize });
  }
}
