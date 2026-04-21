import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { InvoiceLine, NormalizedProduct } from '../../core/models/invoice.models';
import { NormalizedProductService } from '../../core/services/normalized-product.service';

@Component({
  selector: 'app-normalization-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
  ],
  template: `
    <div class="container normalization">
      <div class="pageHeader">
        <div class="pageEyebrow">Normalización</div>
        <div class="pageHeaderTitle">Mapeo de líneas a productos</div>
        <div class="pageHeaderSubtitle">Conecta líneas OCR a productos canónicos.</div>
      </div>

      <div class="grid">
        <mat-card class="surfaceCard panel">
          <div class="panelHeader">
            <div>
              <div class="sectionTitle">Líneas sin mapear</div>
              <div class="sectionSubtitle">Selecciona una línea para sugerencias.</div>
            </div>
            <div class="chip">
              {{ pendingCount() }} pendientes
            </div>
          </div>

          <div class="filters">
            <mat-form-field appearance="outline" class="field">
              <mat-label>Proveedor</mat-label>
              <mat-select [formControl]="form.controls.supplierId">
                <mat-option value="">Todos</mat-option>
                @for (s of suppliers(); track s) {
                  <mat-option [value]="s">{{ s }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="field">
              <mat-label>Buscar</mat-label>
              <input matInput [formControl]="form.controls.query" placeholder="Descripción o código" />
            </mat-form-field>
          </div>

          <div class="lineList">
            @for (line of filteredLines(); track line.id) {
              <button
                type="button"
                class="lineItem"
                [class.is-active]="selectedLine()?.id === line.id"
                (click)="selectLine(line)"
              >
                <div class="lineTitle">{{ line.description }}</div>
                <div class="lineMeta">
                  {{ line.quantity ?? 0 }} · {{ line.unitPrice ?? 0 | number:'1.2-2' }} €
                </div>
              </button>
            }
          </div>
        </mat-card>

        <mat-card class="surfaceCard panel">
          <div class="panelHeader">
            <div>
              <div class="sectionTitle">Productos normalizados</div>
              <div class="sectionSubtitle">Selecciona un producto para mapear.</div>
            </div>
            <button mat-stroked-button (click)="createFromLine()" [disabled]="!selectedLine()">Crear producto</button>
          </div>

          <mat-form-field appearance="outline" class="field">
            <mat-label>Buscar producto</mat-label>
            <input matInput [formControl]="form.controls.productQuery" placeholder="Nombre o SKU" />
          </mat-form-field>

          <div class="productList">
            @for (product of filteredProducts(); track product.id) {
              <button type="button" class="productItem" (click)="mapProduct(product)">
                <div class="productTitle">{{ product.canonicalName }}</div>
                <div class="productMeta">{{ product.canonicalSku || 'Sin SKU' }}</div>
              </button>
            }
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .normalization { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-4); }
    .panel { display: grid; gap: var(--space-3); }
    .panelHeader { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
    .chip { font-size: var(--font-size-12); padding: 4px 8px; border-radius: 999px; background: rgba(47, 129, 237, 0.12); color: #2f6ad1; font-weight: 600; }
    .filters { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
    .field { width: 100%; }
    .lineList, .productList { display: grid; gap: 8px; max-height: 520px; overflow: auto; }
    .lineItem, .productItem {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 10px;
      text-align: left;
      background: var(--color-surface);
      cursor: pointer;
    }
    .lineItem.is-active { border-color: var(--color-primary-500); background: rgba(47, 129, 237, 0.06); }
    .lineTitle, .productTitle { font-weight: var(--font-weight-medium); }
    .lineMeta, .productMeta { font-size: var(--font-size-12); color: var(--color-muted); }

    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .filters { grid-template-columns: 1fr; }
    }
  `],
})
export class NormalizationPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(NormalizedProductService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    supplierId: [''],
    query: [''],
    productQuery: [''],
  });

  readonly selectedLine = signal<InvoiceLine | null>(null);
  readonly lines = signal<InvoiceLine[]>(buildMockLines());
  readonly products = signal<NormalizedProduct[]>([]);

  readonly suppliers = computed(() => {
    const set = new Set<string>();
    for (const line of this.lines()) {
      if (line.productCode) set.add(line.productCode);
    }
    return Array.from(set);
  });

  readonly filteredLines = computed(() => {
    const supplierId = this.form.controls.supplierId.value || '';
    const q = (this.form.controls.query.value || '').toLowerCase();
    return this.lines().filter((line) => {
      const matchesSupplier = !supplierId || line.productCode === supplierId;
      const matchesQuery = !q || line.description.toLowerCase().includes(q);
      return matchesSupplier && matchesQuery;
    });
  });

  readonly filteredProducts = computed(() => {
    const q = (this.form.controls.productQuery.value || '').toLowerCase();
    return this.products().filter((p) => {
      const name = p.canonicalName.toLowerCase();
      const sku = p.canonicalSku?.toLowerCase() ?? '';
      return !q || name.includes(q) || sku.includes(q);
    });
  });

  readonly pendingCount = computed(() => this.lines().length);

  constructor() {
    this.productService.listNormalized().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => this.products.set(items),
      error: () => this.snackBar.open('No se pudieron cargar productos.', 'Cerrar', { duration: 2500 }),
    });
  }

  selectLine(line: InvoiceLine) {
    this.selectedLine.set(line);
    if (!this.form.controls.productQuery.value) {
      this.form.controls.productQuery.setValue(line.description.slice(0, 30));
    }
  }

  mapProduct(product: NormalizedProduct) {
    const line = this.selectedLine();
    if (!line) return;
    this.productService.mapLine(line.id, product.id, 'manual').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.lines.set(this.lines().filter((l) => l.id !== line.id));
        this.selectedLine.set(null);
        this.snackBar.open('Línea mapeada.', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snackBar.open('No se pudo mapear.', 'Cerrar', { duration: 2500 }),
    });
  }

  createFromLine() {
    const line = this.selectedLine();
    if (!line) return;
    const name = line.description.trim();
    this.productService.createNormalized(null, name).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (product) => {
        this.products.set([product, ...this.products()]);
        this.snackBar.open('Producto creado.', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snackBar.open('No se pudo crear.', 'Cerrar', { duration: 2500 }),
    });
  }
}

function buildMockLines(): InvoiceLine[] {
  return [
    {
      id: 'line-1',
      invoiceId: 'inv-1',
      description: 'Aceite oliva 5L',
      quantity: 2,
      unitPrice: 28.5,
      lineTotal: 57,
      productCode: 'SALAMAR',
    },
    {
      id: 'line-2',
      invoiceId: 'inv-2',
      description: 'Arroz bomba 1kg',
      quantity: 5,
      unitPrice: 3.2,
      lineTotal: 16,
      productCode: 'SALAMAR',
    },
  ];
}
