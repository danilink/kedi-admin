import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { Dish, DishCreateDto, DishSortBy, DishSortDir, DishUpdateDto } from '../../core/models/dish.models';
import { DishService } from '../../core/services/dish.service';
import { DishCreateDialogComponent } from './components/dish-create-dialog/dish-create-dialog.component';
import { DishEditDialogComponent } from './components/dish-edit-dialog/dish-edit-dialog.component';
import { DishTableComponent } from './components/dish-table/dish-table.component';

type ActiveFilter = 'all' | 'true' | 'false';

@Component({
  selector: 'app-dishes-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    DishTableComponent,
  ],
  template: `
    <div class="container dishesPage">
      <div class="pageHeader">
        <div class="pageEyebrow">Dishes</div>
        <div class="pageHeaderTitle">Listado de platos</div>
        <div class="pageHeaderSubtitle">Búsqueda, edición y mantenimiento del catálogo de platos.</div>
      </div>

      <mat-card class="surfaceCard">
        <div class="toolbar">
          <div class="toolbarRow">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="searchField">
              <mat-label>Buscar por code o name</mat-label>
              <input matInput [formControl]="searchControl" placeholder="Ej: ravioli" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filterField">
              <mat-label>Estado</mat-label>
              <mat-select [formControl]="activeFilterControl">
                <mat-option value="all">Todos</mat-option>
                <mat-option value="true">Activos</mat-option>
                <mat-option value="false">Inactivos</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-raised-button class="createButton" (click)="openCreateDialog()" [disabled]="creating()">
              <mat-icon>add</mat-icon>
              Crear
            </button>
          </div>

          @if (listMessage()) {
            <div class="listMessage" role="status" aria-live="polite">
              <mat-icon>check_circle</mat-icon>
              <span>{{ listMessage() }}</span>
            </div>
          }

          <div class="toolbarMeta">
            {{ filteredDishes().length }} resultados en la página actual · página {{ pageIndex() + 1 }}
          </div>
        </div>

        <app-dish-table
          [dishes]="filteredDishes()"
          [loading]="loadingList()"
          [error]="listError()"
          [totalCount]="totalCount()"
          [pageIndex]="pageIndex()"
          [pageSize]="pageSize()"
          [sortField]="sortField()"
          [sortDirection]="sortDirection()"
          (retry)="refresh()"
          (pageChange)="onPageChange($event)"
          (sort)="toggleSort($event)"
          (edit)="openEdit($event)"
          (remove)="confirmDelete($event)"
        />
      </mat-card>
    </div>
  `,
  styles: [`
    .dishesPage { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .toolbar {
      display: grid;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
      padding: 28px;
      border-radius: 12px;
      background: linear-gradient(180deg, #f9fcff, #f4f8fe);
      border: 1px solid rgba(194, 208, 229, 0.7);
    }
    .toolbarRow {
      display: grid;
      gap: var(--space-2);
      grid-template-columns: minmax(320px, 460px) minmax(160px, 220px) auto;
      align-items: end;
      justify-content: space-between;
    }
    .toolbarMeta {
      color: var(--color-muted);
      font-size: var(--font-size-12);
      font-weight: var(--font-weight-medium);
      padding-inline: 2px;
    }
    .listMessage {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(19, 121, 91, 0.1);
      color: var(--color-success-500);
      border: 1px solid rgba(19, 121, 91, 0.18);
      font-weight: var(--font-weight-medium);
    }
    .listMessage mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }
    .searchField,
    .filterField { width: 100%; }
    .searchField,
    .filterField {
      --mat-form-field-container-height: 45px;
      --mat-form-field-container-vertical-padding: 10px;
    }
    .createButton {
      justify-self: end;
      align-self: end;
      min-width: 120px;
      height: 45px;
      min-height: 0;
      padding-inline: 28px;
      border-radius: 999px;
      border: 1px solid #1f7a4f;
      background: linear-gradient(135deg, #2f9a63 0%, #257a51 52%, #1c5e3f 100%);
      color: #f6fff9;
      box-shadow: 0 12px 24px rgba(28, 94, 63, 0.18);
    }
    .createButton:hover:not(:disabled) {
      background: linear-gradient(135deg, #36a86c 0%, #2b8658 52%, #215f41 100%);
      box-shadow: 0 14px 28px rgba(28, 94, 63, 0.22);
    }
    .createButton:disabled {
      background: linear-gradient(135deg, #8fc4a8 0%, #7fb397 100%);
      color: rgba(246, 255, 249, 0.82);
      box-shadow: none;
      border-color: rgba(31, 122, 79, 0.18);
    }
    .createButton mat-icon {
      color: inherit;
    }

    @media (max-width: 900px) {
      .toolbarRow {
        grid-template-columns: 1fr 1fr;
      }
      .createButton {
        grid-column: auto;
        width: 100%;
        justify-self: stretch;
      }
    }

    @media (max-width: 640px) {
      .toolbarRow {
        grid-template-columns: 1fr;
      }
      .createButton {
        grid-column: 1;
        width: 100%;
      }
      .toolbar {
        padding: 28px;
      }
    }
  `],
})
export class DishesPageComponent {
  private readonly service = inject(DishService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly activeFilterControl = new FormControl<ActiveFilter>('all', { nonNullable: true });

  readonly allDishes = signal<Dish[]>([]);
  readonly loadingList = signal(false);
  readonly creating = signal(false);
  readonly listError = signal('');
  readonly listMessage = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly hasNextPage = signal(false);

  readonly query = signal('');
  readonly activeFilter = signal<ActiveFilter>('all');
  readonly sortField = signal<DishSortBy>('code');
  readonly sortDirection = signal<DishSortDir>('asc');

  readonly filteredDishes = computed(() => {
    const activeFilter = this.activeFilter();

    const filtered = this.allDishes().filter((dish) => {
      const matchesActive = activeFilter === 'all'
        || (activeFilter === 'true' ? dish.is_active : !dish.is_active);

      return matchesActive;
    });

    return filtered;
  });

  readonly totalCount = computed(() => {
    const loaded = this.pageIndex() * this.pageSize() + this.allDishes().length;
    return this.hasNextPage() ? loaded + 1 : loaded;
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.query.set(value.trim());
        this.pageIndex.set(0);
        this.listMessage.set('');
        this.loadList();
      });

    this.activeFilterControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.activeFilter.set(value);
        this.pageIndex.set(0);
      });

    this.loadList();
  }

  refresh() {
    this.listMessage.set('');
    this.loadList();
  }

  openCreateDialog() {
    const ref = this.dialog.open(DishCreateDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      autoFocus: 'first-tabbable',
    });

    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((payload: DishCreateDto | null) => {
      if (!payload) return;
      this.create(payload);
    });
  }

  onPageChange(event: { pageIndex: number; pageSize: number }) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.listMessage.set('');
    this.loadList();
  }

  toggleSort(field: DishSortBy) {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }

    this.pageIndex.set(0);
    this.listMessage.set('');
    this.loadList();
  }

  create(payload: DishCreateDto) {
    this.creating.set(true);
    this.service.createDish(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.creating.set(false);
        this.pageIndex.set(0);
        this.listMessage.set('Plato creado correctamente. El listado se ha actualizado.');
        this.loadList();
      },
      error: (err) => {
        this.creating.set(false);
        this.snackBar.open(this.errorMessage(err?.status, 'create', err?.error), 'Cerrar', { duration: 3500 });
      },
    });
  }

  openEdit(dish: Dish) {
    this.service.getDishById(dish.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (fullDish) => {
        const ref = this.dialog.open(DishEditDialogComponent, {
          width: '760px',
          maxWidth: '95vw',
          autoFocus: 'first-tabbable',
          data: { dish: fullDish },
        });

        ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((patch: DishUpdateDto | null) => {
          if (!patch) return;
          if (Object.keys(patch).length === 0) {
            this.snackBar.open('No hay cambios para guardar.', 'Cerrar', { duration: 2200 });
            return;
          }
          this.updateDish(dish.id, patch);
        });
      },
      error: (err) => {
        this.snackBar.open(this.errorMessage(err?.status, 'detail', err?.error), 'Cerrar', { duration: 3500 });
      },
    });
  }

  confirmDelete(dish: Dish) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      autoFocus: 'first-tabbable',
      data: {
        title: 'Eliminar plato',
        message: `Se eliminará "${dish.name}" (${dish.code}). Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
      },
    });

    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) return;

      this.service.deleteDish(dish.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          if (this.allDishes().length === 1 && this.pageIndex() > 0) {
            this.pageIndex.update((value) => Math.max(0, value - 1));
          }
          this.loadList();
          this.snackBar.open('Plato eliminado.', 'Cerrar', { duration: 2500 });
        },
        error: (err) => {
          this.snackBar.open(this.errorMessage(err?.status, 'delete', err?.error), 'Cerrar', { duration: 3500 });
        },
      });
    });
  }

  private updateDish(id: number, payload: DishUpdateDto) {
    this.service.updateDish(id, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedDish) => {
        this.allDishes.update((items) => items.map((item) => (item.id === id ? updatedDish : item)));
        this.snackBar.open('Plato actualizado.', 'Cerrar', { duration: 2500 });
      },
      error: (err) => {
        this.snackBar.open(this.errorMessage(err?.status, 'update', err?.error), 'Cerrar', { duration: 3500 });
      },
    });
  }

  private loadList() {
    this.loadingList.set(true);
    this.listError.set('');

    this.service.listDishes({
      q: this.query() || undefined,
      skip: this.pageIndex() * this.pageSize(),
      limit: this.pageSize(),
      sort_by: this.sortField(),
      sort_dir: this.sortDirection(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.allDishes.set(items);
        this.hasNextPage.set(items.length === this.pageSize());
        this.loadingList.set(false);
      },
      error: (err) => {
        this.allDishes.set([]);
        this.hasNextPage.set(false);
        this.loadingList.set(false);
        this.listError.set(this.errorMessage(err?.status, 'list', err?.error));
      },
    });
  }

  private errorMessage(
    status?: number,
    action: 'list' | 'detail' | 'create' | 'update' | 'delete' = 'list',
    payload?: unknown
  ) {
    const detail = this.extractDetail(payload);

    if (status === 401) return 'Tu sesión ha expirado o no estás autenticado.';
    if (status === 403) return 'No tienes permisos para gestionar platos.';
    if (status === 404) return detail || 'Dish not found';
    if (status === 409) return detail || 'Conflicto: revisa si el code ya existe.';
    if (status === 422) return detail || 'Datos inválidos. Revisa code, name, price e image_url.';

    if (action === 'list') {
      return detail || 'No se pudo cargar el listado de platos.';
    }

    return detail || 'No se pudo completar la operación sobre platos.';
  }

  private extractDetail(payload: unknown) {
    if (!payload || typeof payload !== 'object') return '';
    const detail = (payload as { detail?: unknown }).detail;
    return typeof detail === 'string' ? detail : '';
  }
}
