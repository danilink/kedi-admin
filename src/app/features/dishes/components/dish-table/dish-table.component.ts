import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { Dish, DishSortBy, DishSortDir } from '../../../../core/models/dish.models';

@Component({
  selector: 'app-dish-table',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatPaginatorModule, MatProgressBarModule, MatTableModule],
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

    @if (!loading && !error && totalCount === 0) {
      <div class="stateBlock empty">
        <mat-icon>restaurant_menu</mat-icon>
        <div>
          <div class="stateTitle">Sin platos</div>
          <div class="stateSubtitle">Todavía no hay platos disponibles.</div>
        </div>
      </div>
    }

    @if (!loading && !error && totalCount > 0 && dishes.length === 0) {
      <div class="stateBlock empty">
        <mat-icon>filter_alt_off</mat-icon>
        <div>
          <div class="stateTitle">Sin resultados</div>
          <div class="stateSubtitle">No hay coincidencias para la búsqueda o filtros activos.</div>
        </div>
      </div>
    }

    <div class="tableWrap" [class.is-loading]="loading">
      <table mat-table [dataSource]="dishes" class="mat-elevation-z0">
        <ng-container matColumnDef="code">
          <th mat-header-cell *matHeaderCellDef>
            <button type="button" class="sortButton" (click)="sort.emit('code')">
              <span>Code</span>
              <mat-icon>{{ iconFor('code') }}</mat-icon>
            </button>
          </th>
          <td mat-cell *matCellDef="let row" class="codeCell">{{ row.code }}</td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>
            <button type="button" class="sortButton" (click)="sort.emit('name')">
              <span>Name</span>
              <mat-icon>{{ iconFor('name') }}</mat-icon>
            </button>
          </th>
          <td mat-cell *matCellDef="let row">
            <div class="nameCell">
              <strong>{{ row.name }}</strong>
              <span>{{ row.description || 'Sin descripción' }}</span>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="price">
          <th mat-header-cell *matHeaderCellDef>
            <button type="button" class="sortButton numeric" (click)="sort.emit('price')">
              <span>Price</span>
              <mat-icon>{{ iconFor('price') }}</mat-icon>
            </button>
          </th>
          <td mat-cell *matCellDef="let row" class="numeric">{{ formatPrice(row.price) }}</td>
        </ng-container>

        <ng-container matColumnDef="is_by_weight">
          <th mat-header-cell *matHeaderCellDef>By Weight</th>
          <td mat-cell *matCellDef="let row">{{ row.is_by_weight ? 'Sí' : 'No' }}</td>
        </ng-container>

        <ng-container matColumnDef="is_active">
          <th mat-header-cell *matHeaderCellDef>Active</th>
          <td mat-cell *matCellDef="let row">
            <span class="statusPill" [class.inactive]="!row.is_active">{{ row.is_active ? 'Sí' : 'No' }}</span>
          </td>
        </ng-container>

        <ng-container matColumnDef="created_at">
          <th mat-header-cell *matHeaderCellDef>
            <button type="button" class="sortButton" (click)="sort.emit('created_at')">
              <span>Created At</span>
              <mat-icon>{{ iconFor('created_at') }}</mat-icon>
            </button>
          </th>
          <td mat-cell *matCellDef="let row">{{ row.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
        </ng-container>

        <ng-container matColumnDef="updated_at">
          <th mat-header-cell *matHeaderCellDef>
            <button type="button" class="sortButton" (click)="sort.emit('updated_at')">
              <span>Updated At</span>
              <mat-icon>{{ iconFor('updated_at') }}</mat-icon>
            </button>
          </th>
          <td mat-cell *matCellDef="let row">{{ row.updated_at | date:'dd/MM/yyyy HH:mm' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let row">
            <div class="rowActions">
              <button mat-icon-button aria-label="Editar plato" (click)="edit.emit(row)">
                <mat-icon>edit</mat-icon>
              </button>
              <button
                mat-icon-button
                color="warn"
                aria-label="Eliminar plato"
                [disabled]="!row.is_active"
                (click)="remove.emit(row)"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr
          mat-row
          *matRowDef="let row; columns: columns"
          [class.rowInactive]="!row.is_active"
        ></tr>
      </table>
    </div>

    <mat-paginator
      [length]="totalCount"
      [pageIndex]="pageIndex"
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
    table { width: 100%; min-width: 1080px; }
    .sortButton {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 0;
      background: transparent;
      padding: 0;
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    .sortButton.numeric { margin-left: auto; }
    .codeCell {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
      letter-spacing: 0.03em;
    }
    .nameCell {
      display: grid;
      gap: 3px;
      padding-block: 6px;
    }
    .nameCell span {
      color: var(--color-muted);
      font-size: var(--font-size-12);
      line-height: 1.35;
    }
    .numeric { text-align: right; }
    td.mat-column-actions, th.mat-column-actions { text-align: right; }
    .rowInactive {
      background: rgba(86, 97, 121, 0.07);
    }
    .rowInactive td {
      color: var(--color-muted);
    }
    .rowInactive .nameCell span,
    .rowInactive .codeCell {
      color: var(--color-muted-2);
    }
    .rowInactive .rowActions .mat-mdc-icon-button {
      color: var(--color-muted-2);
    }
    .rowActions .mat-mdc-icon-button[disabled] {
      opacity: 0.42;
    }
    .rowActions { display: inline-flex; gap: 2px; }
    .rowActions .mat-mdc-icon-button { color: var(--color-primary-600); }
    .statusPill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(19, 121, 91, 0.12);
      color: var(--color-success-500);
      font-size: var(--font-size-12);
      font-weight: var(--font-weight-bold);
    }
    .statusPill.inactive {
      background: rgba(183, 59, 59, 0.1);
      color: var(--color-danger-500);
    }
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
      table { min-width: 860px; }
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
export class DishTableComponent {
  @Input() dishes: Dish[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Input() totalCount = 0;
  @Input() pageIndex = 0;
  @Input() pageSize = 10;
  @Input() sortField: DishSortBy = 'code';
  @Input() sortDirection: DishSortDir = 'asc';

  @Output() pageChange = new EventEmitter<{ pageIndex: number; pageSize: number }>();
  @Output() edit = new EventEmitter<Dish>();
  @Output() remove = new EventEmitter<Dish>();
  @Output() retry = new EventEmitter<void>();
  @Output() sort = new EventEmitter<DishSortBy>();

  readonly columns = ['code', 'name', 'price', 'is_by_weight', 'is_active', 'created_at', 'updated_at', 'actions'];
  readonly pageSizeOptions = [10, 20, 50];
  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

  onPageChanged(event: PageEvent) {
    this.pageChange.emit({ pageIndex: event.pageIndex, pageSize: event.pageSize });
  }

  iconFor(field: DishSortBy) {
    if (this.sortField !== field) return 'unfold_more';
    return this.sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  formatPrice(price: string) {
    const amount = Number(price);
    return this.currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
  }
}
