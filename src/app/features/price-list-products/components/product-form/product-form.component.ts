import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { CreateProductPayload } from '../../../../core/models/price-list-product.models';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatButtonModule],
  template: `
    <form class="productForm" [formGroup]="form" (ngSubmit)="submit()">
      @if (title) {
        <div class="sectionTitle">{{ title }}</div>
      }

      <div class="fields">
        <mat-form-field appearance="outline" class="fieldCod">
          <mat-label>COD</mat-label>
          <input matInput formControlName="cod" placeholder="000001" maxlength="40" />
          @if (form.controls.cod.invalid && form.controls.cod.touched) {
            <mat-error>El código es obligatorio.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="fieldDenominacion">
          <mat-label>Denominación</mat-label>
          <input matInput formControlName="denominacion" placeholder="POLLO ASADO" maxlength="200" />
          @if (form.controls.denominacion.invalid && form.controls.denominacion.touched) {
            <mat-error>La denominación es obligatoria.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="fieldPrecio">
          <mat-label>Precio</mat-label>
          <input matInput formControlName="precio" placeholder="11.00" inputmode="decimal" />
          @if (form.controls.precio.invalid && form.controls.precio.touched) {
            <mat-error>Introduce un precio válido con hasta 2 decimales.</mat-error>
          }
        </mat-form-field>

        <mat-checkbox class="fieldWeight" formControlName="byWeight">Por peso</mat-checkbox>
      </div>

      <div class="actions">
        @if (showCancel) {
          <button type="button" mat-stroked-button (click)="cancel.emit()">Cancelar</button>
        }
        <button type="submit" mat-raised-button color="primary" [disabled]="loading">
          {{ loading ? 'Guardando...' : submitLabel }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .productForm { display: grid; gap: var(--space-3); }
    .sectionTitle { font-weight: var(--font-weight-bold); font-size: var(--font-size-16); }
    .fields {
      display: grid;
      gap: var(--space-2);
      grid-template-columns: 180px minmax(0, 1fr) 180px auto;
      align-items: center;
    }
    .fieldCod { grid-column: 1; }
    .fieldDenominacion { grid-column: 2; }
    .fieldPrecio { grid-column: 3; }
    .fieldWeight { grid-column: 4; padding-left: 8px; }
    .actions { display: flex; justify-content: flex-end; gap: var(--space-2); flex-wrap: wrap; }

    @media (max-width: 980px) {
      .fields {
        grid-template-columns: 1fr 1fr;
      }
      .fieldCod { grid-column: 1; }
      .fieldDenominacion { grid-column: 1 / span 2; }
      .fieldPrecio { grid-column: 2; }
      .fieldWeight { grid-column: 1 / span 2; padding-left: 0; }
    }

    @media (max-width: 640px) {
      .fields {
        grid-template-columns: 1fr;
      }
      .fieldCod,
      .fieldDenominacion,
      .fieldPrecio,
      .fieldWeight { grid-column: 1; }
      .actions {
        flex-direction: column-reverse;
      }
      .actions button {
        width: 100%;
      }
    }
  `],
})
export class ProductFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() title = '';
  @Input() submitLabel = 'Guardar';
  @Input() loading = false;
  @Input() showCancel = false;
  @Input() resetKey = 0;
  @Input() initialValue: Partial<CreateProductPayload> | null = null;

  @Output() save = new EventEmitter<CreateProductPayload>();
  @Output() cancel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    cod: ['', [Validators.required, Validators.maxLength(40)]],
    denominacion: ['', [Validators.required, Validators.maxLength(200)]],
    precio: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    byWeight: [false],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] || changes['resetKey']) {
      this.form.reset(
        {
          cod: this.initialValue?.cod ?? '',
          denominacion: this.initialValue?.denominacion ?? '',
          precio: this.formatPrice(this.initialValue?.precio ?? ''),
          byWeight: this.initialValue?.byWeight ?? false,
        },
        { emitEvent: false }
      );
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const price = Number(value.precio);

    if (!Number.isFinite(price) || price < 0) {
      this.form.controls.precio.setErrors({ invalidPrice: true });
      return;
    }

    this.save.emit({
      cod: value.cod.trim(),
      denominacion: value.denominacion.trim(),
      precio: price.toFixed(2),
      byWeight: !!value.byWeight,
    });
  }

  private formatPrice(value: string) {
    const price = Number(value);
    return Number.isFinite(price) ? price.toFixed(2) : value;
  }
}
