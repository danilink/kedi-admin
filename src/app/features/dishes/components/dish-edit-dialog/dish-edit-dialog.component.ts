import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { Dish, DishUpdateDto } from '../../../../core/models/dish.models';
import { DishFormComponent, DishFormValue } from '../dish-form/dish-form.component';

interface DishEditDialogData {
  dish: Dish;
}

@Component({
  selector: 'app-dish-edit-dialog',
  standalone: true,
  imports: [MatDialogModule, DishFormComponent],
  template: `
    <h2 mat-dialog-title>Editar plato</h2>
    <div mat-dialog-content>
      <app-dish-form
        [initialValue]="data.dish"
        [submitLabel]="'Actualizar plato'"
        [showCancel]="true"
        (cancel)="close()"
        (save)="onSave($event)"
      />
    </div>
  `,
})
export class DishEditDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<DishEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: DishEditDialogData
  ) {}

  close() {
    this.dialogRef.close(null);
  }

  onSave(value: DishFormValue) {
    const patch: DishUpdateDto = {};

    if (value.code !== this.data.dish.code) patch.code = value.code;
    if (value.name !== this.data.dish.name) patch.name = value.name;
    if (value.description !== this.data.dish.description) patch.description = value.description;
    if (value.price !== this.data.dish.price) patch.price = value.price;
    if (value.image_url !== this.data.dish.image_url) patch.image_url = value.image_url;
    if (value.is_by_weight !== this.data.dish.is_by_weight) patch.is_by_weight = value.is_by_weight;
    if (value.is_active !== this.data.dish.is_active) patch.is_active = value.is_active;

    this.dialogRef.close(patch);
  }
}
