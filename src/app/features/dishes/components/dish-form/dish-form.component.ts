import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Dish, DishCreateDto } from '../../../../core/models/dish.models';

export interface DishFormValue {
  code: string;
  name: string;
  description: string | null;
  price: string;
  is_by_weight: boolean;
  image_url: string | null;
  is_active: boolean;
}

@Component({
  selector: 'app-dish-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  template: `
    <form class="dishForm" [formGroup]="form" (ngSubmit)="submit()">
      @if (title) {
        <div class="sectionTitle">{{ title }}</div>
      }

      <div class="fields">
        <mat-form-field appearance="outline" class="fieldCode">
          <mat-label>Code</mat-label>
          <input matInput formControlName="code" maxlength="50" placeholder="Ej: RAVIOLI-SETAS" />
          @if (form.controls.code.invalid && form.controls.code.touched) {
            <mat-error>{{ controlError('code') }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="fieldName">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" maxlength="150" placeholder="Ej: Ravioli de setas" />
          @if (form.controls.name.invalid && form.controls.name.touched) {
            <mat-error>{{ controlError('name') }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="fieldPrice">
          <mat-label>Price</mat-label>
          <input matInput formControlName="price" inputmode="decimal" placeholder="11.00" />
          @if (form.controls.price.invalid && form.controls.price.touched) {
            <mat-error>{{ controlError('price') }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="fieldImage">
          <mat-label>Image URL</mat-label>
          <input matInput formControlName="image_url" placeholder="https://..." />
          @if (form.controls.image_url.invalid && form.controls.image_url.touched) {
            <mat-error>{{ controlError('image_url') }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="fieldDescription">
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="4"
            maxlength="1500"
            placeholder="Descripción del plato"
          ></textarea>
        </mat-form-field>

        <div class="toggles" role="group" aria-label="Opciones del plato">
          <mat-checkbox formControlName="is_by_weight">By weight</mat-checkbox>
          <mat-checkbox formControlName="is_active">Active</mat-checkbox>
        </div>
      </div>

      <div class="actions">
        @if (showCancel) {
          <button type="button" mat-stroked-button (click)="cancel.emit()" [disabled]="loading">Cancelar</button>
        }
        <button type="submit" mat-raised-button color="primary" [disabled]="loading">
          {{ loading ? 'Guardando...' : submitLabel }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .dishForm { display: grid; gap: var(--space-3); }
    .sectionTitle { font-weight: var(--font-weight-bold); font-size: var(--font-size-16); }
    .fields {
      display: grid;
      gap: var(--space-2);
      grid-template-columns: minmax(0, 1fr);
      align-items: start;
    }
    .toggles {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      padding: 4px 2px 0;
    }
    .actions { display: flex; justify-content: flex-end; gap: var(--space-2); flex-wrap: wrap; }

    @media (min-width: 720px) {
      .fields {
        grid-template-columns: minmax(180px, 0.8fr) minmax(0, 1.4fr) minmax(160px, 0.7fr);
      }
      .fieldCode { grid-column: 1; }
      .fieldName { grid-column: 2; }
      .fieldPrice { grid-column: 3; }
      .fieldImage { grid-column: 1 / span 3; }
      .fieldDescription { grid-column: 1 / span 3; }
      .toggles { grid-column: 1 / span 3; }
    }

    @media (max-width: 639px) {
      .actions {
        flex-direction: column-reverse;
      }
      .actions button {
        width: 100%;
      }
    }
  `],
})
export class DishFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() title = '';
  @Input() submitLabel = 'Guardar';
  @Input() loading = false;
  @Input() showCancel = false;
  @Input() resetKey = 0;
  @Input() initialValue: Partial<Dish> | null = null;

  @Output() save = new EventEmitter<DishCreateDto>();
  @Output() cancel = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(50), trimmedRequiredValidator()]],
    name: ['', [Validators.required, Validators.maxLength(150), trimmedRequiredValidator()]],
    description: ['', [Validators.maxLength(1500)]],
    price: ['', [Validators.required, decimalPriceValidator()]],
    image_url: ['', [optionalUrlValidator()]],
    is_by_weight: [false],
    is_active: [true],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialValue'] || changes['resetKey']) {
      this.form.reset(
        {
          code: this.initialValue?.code ?? '',
          name: this.initialValue?.name ?? '',
          description: this.initialValue?.description ?? '',
          price: this.initialValue?.price ?? '',
          image_url: this.initialValue?.image_url ?? '',
          is_by_weight: this.initialValue?.is_by_weight ?? false,
          is_active: this.initialValue?.is_active ?? true,
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

    const rawValue = this.form.getRawValue();

    this.save.emit({
      code: rawValue.code.trim(),
      name: rawValue.name.trim(),
      description: normalizeNullableText(rawValue.description),
      price: normalizePrice(rawValue.price),
      image_url: normalizeNullableText(rawValue.image_url),
      is_by_weight: !!rawValue.is_by_weight,
      is_active: !!rawValue.is_active,
    });
  }

  controlError(controlName: 'code' | 'name' | 'price' | 'image_url') {
    const control = this.form.controls[controlName];

    if (control.hasError('required') || control.hasError('trimmedRequired')) {
      return `${controlName === 'code' ? 'El code' : 'El name'} es obligatorio.`;
    }

    if (control.hasError('maxlength')) {
      return controlName === 'code' ? 'Máximo 50 caracteres.' : 'Máximo 150 caracteres.';
    }

    if (controlName === 'price' && control.hasError('invalidDecimal')) {
      return 'Usa un decimal válido mayor o igual que 0 con hasta 2 decimales.';
    }

    if (controlName === 'image_url' && control.hasError('invalidUrl')) {
      return 'Introduce una URL válida.';
    }

    return 'Revisa este campo.';
  }
}

function trimmedRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    return value ? null : { trimmedRequired: true };
  };
}

function decimalPriceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim().replace(',', '.') : '';
    if (!value) return null;
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return { invalidDecimal: true };
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? null : { invalidDecimal: true };
  };
}

function optionalUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';
    if (!value) return null;

    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? null : { invalidUrl: true };
    } catch {
      return { invalidUrl: true };
    }
  };
}

function normalizeNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePrice(value: string) {
  return Number(value.trim().replace(',', '.')).toFixed(2);
}
