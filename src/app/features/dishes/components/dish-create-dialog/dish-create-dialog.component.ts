import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { DishCreateDto } from '../../../../core/models/dish.models';
import { DishFormComponent } from '../dish-form/dish-form.component';

@Component({
  selector: 'app-dish-create-dialog',
  standalone: true,
  imports: [MatDialogModule, DishFormComponent],
  template: `
    <h2 mat-dialog-title>Crear plato</h2>
    <div mat-dialog-content>
      <app-dish-form
        [submitLabel]="'Crear plato'"
        [showCancel]="true"
        (cancel)="close()"
        (save)="onSave($event)"
      />
    </div>
  `,
})
export class DishCreateDialogComponent {
  constructor(private readonly dialogRef: MatDialogRef<DishCreateDialogComponent>) {}

  close() {
    this.dialogRef.close(null);
  }

  onSave(value: DishCreateDto) {
    this.dialogRef.close(value);
  }
}
