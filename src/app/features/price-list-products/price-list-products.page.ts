import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  CreateProductPayload,
  PriceListProduct,
  UpdateProductPayload,
} from '../../core/models/price-list-product.models';
import { PriceListProductService } from '../../core/services/price-list-product.service';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { ProductEditDialogComponent } from './components/product-edit-dialog/product-edit-dialog.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { ProductTableComponent } from './components/product-table/product-table.component';

@Component({
  selector: 'app-price-list-products-page',
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
    ProductFormComponent,
    ProductTableComponent,
  ],
  template: `
    <div class="container productsPage">
      <div class="pageHeader">
        <div class="pageEyebrow">Productos</div>
        <div class="pageHeaderTitle">Listado de precios</div>
        <div class="pageHeaderSubtitle">Gestión completa de productos y precios de venta.</div>
      </div>

      <mat-card class="surfaceCard">
        <div class="toolbar">
          <div class="toolbarMain">
            <mat-form-field appearance="outline" class="searchField">
              <mat-label>Buscar por código o denominación</mat-label>
              <input matInput [formControl]="searchControl" placeholder="Ej: pollo" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <button mat-stroked-button (click)="refresh()" [disabled]="loadingList()">
              <mat-icon>refresh</mat-icon>
              Recargar
            </button>
          </div>

          <div class="toolbarMeta">
            Página {{ page() }} · {{ products().length }} resultados en vista
          </div>
        </div>

        <app-product-table
          [products]="products()"
          [loading]="loadingList()"
          [error]="listError()"
          [page]="page()"
          [pageSize]="pageSize()"
          [hasNextPage]="hasNextPage()"
          (retry)="refresh()"
          (pageChange)="onPageChange($event)"
          (edit)="openEdit($event)"
          (remove)="confirmDelete($event)"
        />
      </mat-card>

      <mat-card class="surfaceCard">
        <app-product-form
          [title]="'Crear producto'"
          [submitLabel]="'Crear producto'"
          [loading]="creating()"
          [resetKey]="createResetKey()"
          (save)="create($event)"
        />
      </mat-card>
    </div>
  `,
  styles: [`
    .productsPage { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .toolbar {
      display: grid;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
      padding: 10px;
      border-radius: 12px;
      background: linear-gradient(180deg, #f9fcff, #f4f8fe);
      border: 1px solid rgba(194, 208, 229, 0.7);
    }
    .toolbarMain {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
    .toolbarMeta {
      color: var(--color-muted);
      font-size: var(--font-size-12);
      font-weight: var(--font-weight-medium);
      padding-inline: 2px;
    }
    .searchField { min-width: min(540px, 100%); }

    @media (max-width: 900px) {
      .toolbarMain {
        align-items: stretch;
      }
      .toolbarMain button {
        width: 100%;
      }
      .searchField {
        min-width: 100%;
      }
    }

    @media (max-width: 520px) {
      .toolbar {
        padding: 8px;
      }
      .toolbarMeta {
        font-size: var(--font-size-11);
      }
    }
  `],
})
export class PriceListProductsPageComponent {
  private readonly service = inject(PriceListProductService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly products = signal<PriceListProduct[]>([]);
  readonly loadingList = signal(false);
  readonly creating = signal(false);
  readonly listError = signal('');

  readonly page = signal(1);
  readonly pageSize = signal(50);
  readonly hasNextPage = signal(false);
  readonly query = signal('');
  readonly createResetKey = signal(0);

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.query.set(value.trim());
        this.page.set(1);
        this.loadList();
      });

    this.loadList();
  }

  refresh() {
    this.loadList();
  }

  onPageChange(payload: { page: number; page_size: number }) {
    this.page.set(payload.page);
    this.pageSize.set(payload.page_size);
    this.loadList();
  }

  create(payload: CreateProductPayload) {
    this.creating.set(true);
    this.service.createProduct(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.creating.set(false);
        this.createResetKey.update((value) => value + 1);
        this.snackBar.open('Producto creado correctamente.', 'Cerrar', { duration: 2500 });
        this.page.set(1);
        this.loadList();
      },
      error: (err) => {
        this.creating.set(false);
        this.snackBar.open(this.errorMessage(err?.status, 'create', err?.error), 'Cerrar', { duration: 3500 });
      },
    });
  }

  openEdit(product: PriceListProduct) {
    this.service.getProductById(product.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (fullProduct) => {
        const ref = this.dialog.open(ProductEditDialogComponent, {
          width: '680px',
          maxWidth: '95vw',
          data: { product: fullProduct },
        });

        ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((patch: UpdateProductPayload | null) => {
          if (!patch) return;
          if (Object.keys(patch).length === 0) {
            this.snackBar.open('No hay cambios para guardar.', 'Cerrar', { duration: 2200 });
            return;
          }
          this.updateProduct(product.id, patch);
        });
      },
      error: (err) => {
        this.snackBar.open(this.errorMessage(err?.status, 'detail', err?.error), 'Cerrar', { duration: 3500 });
      },
    });
  }

  confirmDelete(product: PriceListProduct) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar producto',
        message: `Se eliminará ${product.denominacion} (${product.cod}). Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
      },
    });

    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.service.deleteProduct(product.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.snackBar.open('Producto eliminado.', 'Cerrar', { duration: 2500 });
          if (this.products().length === 1 && this.page() > 1) {
            this.page.update((page) => Math.max(1, page - 1));
          }
          this.loadList();
        },
        error: (err) => {
          this.snackBar.open(this.errorMessage(err?.status, 'delete', err?.error), 'Cerrar', { duration: 3500 });
        },
      });
    });
  }

  private loadList() {
    this.loadingList.set(true);
    this.listError.set('');

    this.service
      .listProducts({
        page: this.page(),
        page_size: this.pageSize(),
        q: this.query() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.products.set(items);
          this.hasNextPage.set(items.length === this.pageSize());
          this.loadingList.set(false);
        },
        error: (err) => {
          this.products.set([]);
          this.hasNextPage.set(false);
          this.loadingList.set(false);
          this.listError.set(this.errorMessage(err?.status, 'list', err?.error));
        },
      });
  }

  private updateProduct(id: string, payload: UpdateProductPayload) {
    this.service.updateProduct(id, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.snackBar.open('Producto actualizado.', 'Cerrar', { duration: 2500 });
        this.loadList();
      },
      error: (err) => {
        this.snackBar.open(this.errorMessage(err?.status, 'update', err?.error), 'Cerrar', { duration: 3500 });
      },
    });
  }

  private errorMessage(status: number, action: 'list' | 'create' | 'detail' | 'update' | 'delete', data: any) {
    if (status === 409 && action !== 'list') {
      const backend = typeof data?.detail === 'string' ? data.detail : typeof data?.message === 'string' ? data.message : '';
      if (backend.includes('Product cod already exists')) {
        return 'El código ya existe. Usa un COD distinto.';
      }
      return 'Ya existe un producto con ese código.';
    }

    if (status === 404) {
      if (action === 'list') return 'No se encontró el recurso de listado.';
      return 'Producto no encontrado.';
    }

    if (status === 401 || status === 403) return 'No autorizado para operar con productos.';
    if (status === 422) return 'Datos inválidos. Revisa los campos enviados.';

    const fallback: Record<number, string> = {
      0: 'No se pudo conectar con el servidor.',
      400: 'Solicitud incorrecta.',
      500: 'Error interno del servidor.',
      502: 'Servidor no disponible.',
      503: 'Servicio en mantenimiento.',
    };

    return fallback[status] ?? 'Ocurrió un error inesperado.';
  }
}
