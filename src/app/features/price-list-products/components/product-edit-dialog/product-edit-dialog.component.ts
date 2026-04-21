import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import {
  PriceListProduct,
  UpdateProductPayload,
} from '../../../../core/models/price-list-product.models';
import { ProductFormComponent } from '../product-form/product-form.component';

interface ProductEditDialogData {
  product: PriceListProduct;
}

@Component({
  selector: 'app-product-edit-dialog',
  standalone: true,
  imports: [MatDialogModule, ProductFormComponent],
  template: `
    <h2 mat-dialog-title>Editar producto</h2>
    <div mat-dialog-content>
      <app-product-form
        [initialValue]="data.product"
        [submitLabel]="'Actualizar'"
        [loading]="false"
        [showCancel]="true"
        (cancel)="close()"
        (save)="onSave($event)"
      />
    </div>
  `,
})
export class ProductEditDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<ProductEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ProductEditDialogData
  ) {}

  close() {
    this.dialogRef.close(null);
  }

  onSave(value: { cod: string; precio: string; denominacion: string; byWeight: boolean }) {
    const patch: UpdateProductPayload = {};

    if (value.cod !== this.data.product.cod) patch.cod = value.cod;
    if (value.denominacion !== this.data.product.denominacion) patch.denominacion = value.denominacion;
    if (value.precio !== this.data.product.precio) patch.precio = value.precio;
    if (value.byWeight !== this.data.product.byWeight) patch.byWeight = value.byWeight;

    this.dialogRef.close(patch);
  }
}
