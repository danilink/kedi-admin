import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SelectionModel } from '@angular/cdk/collections';

import { Invoice } from '../../../core/models/invoice.models';
import { InvoiceService } from '../../../core/services/invoice.service';
import { ComparisonService } from '../../../core/services/comparison.service';

@Component({
  selector: 'app-comparisons-new-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatStepperModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonModule,
    MatInputModule,
  ],
  template: `
    <div class="container comparisonsNew">
      <div class="pageHeader">
        <div class="pageEyebrow">Comparaciones</div>
        <div class="pageHeaderTitle">Nueva comparación</div>
        <div class="pageHeaderSubtitle">Selecciona facturas y define parámetros.</div>
      </div>

      <mat-card class="surfaceCard">
        <mat-stepper [linear]="true" [orientation]="isMobile() ? 'vertical' : 'horizontal'">
          <mat-step label="Facturas">
            <div class="stepBlock">
              <div class="tableWrap">
                <table mat-table [dataSource]="invoices()" class="mat-elevation-z0">
                  <ng-container matColumnDef="select">
                    <th mat-header-cell *matHeaderCellDef>
                      <mat-checkbox
                        [checked]="isAllSelected()"
                        [indeterminate]="selection.hasValue() && !isAllSelected()"
                        (change)="toggleAll()"
                      ></mat-checkbox>
                    </th>
                    <td mat-cell *matCellDef="let row">
                      <mat-checkbox
                        (click)="$event.stopPropagation()"
                        [checked]="selection.isSelected(row)"
                        (change)="selection.toggle(row)"
                      ></mat-checkbox>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="supplier">
                    <th mat-header-cell *matHeaderCellDef>Proveedor</th>
                    <td mat-cell *matCellDef="let row">{{ row.supplier?.name || '—' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="number">
                    <th mat-header-cell *matHeaderCellDef>Factura</th>
                    <td mat-cell *matCellDef="let row">{{ row.number || row.originalFileName }}</td>
                  </ng-container>
                  <ng-container matColumnDef="total">
                    <th mat-header-cell *matHeaderCellDef>Total</th>
                    <td mat-cell *matCellDef="let row">{{ row.total ?? 0 | number:'1.2-2' }} {{ row.currency || 'EUR' }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="columns"></tr>
                  <tr mat-row *matRowDef="let row; columns: columns"></tr>
                </table>
              </div>
              <div class="stepActions">
                <button mat-raised-button color="primary" matStepperNext [disabled]="selection.selected.length < 2">
                  Continuar
                </button>
              </div>
            </div>
          </mat-step>

          <mat-step label="Parámetros">
            <div class="stepBlock">
              <form [formGroup]="form" class="form">
                <mat-form-field appearance="outline">
                  <mat-label>Nombre</mat-label>
                  <input matInput formControlName="name" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Notas</mat-label>
                  <textarea matInput formControlName="notes" rows="3"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Parámetros (JSON)</mat-label>
                  <textarea matInput formControlName="params" rows="4"></textarea>
                </mat-form-field>
              </form>
              <div class="stepActions">
                <button mat-stroked-button matStepperPrevious>Atrás</button>
                <button mat-raised-button color="primary" matStepperNext [disabled]="form.invalid">
                  Continuar
                </button>
              </div>
            </div>
          </mat-step>

          <mat-step label="Resumen">
            <div class="stepBlock">
              <div class="summary">
                <div><strong>Facturas:</strong> {{ selection.selected.length }}</div>
                <div><strong>Nombre:</strong> {{ form.controls.name.value }}</div>
              </div>
              <div class="stepActions">
                <button mat-stroked-button matStepperPrevious>Atrás</button>
                <button mat-raised-button color="primary" (click)="create()">Crear comparación</button>
              </div>
            </div>
          </mat-step>
        </mat-stepper>
      </mat-card>
    </div>
  `,
  styles: [`
    .comparisonsNew { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .comparisonsNew ::ng-deep .mat-step-header .mat-step-icon-selected {
      background: var(--color-primary-500);
      color: #fff;
    }
    .comparisonsNew ::ng-deep .mat-step-header .mat-step-icon-state-edit {
      background: rgba(47, 94, 159, 0.2);
      color: var(--color-primary-700);
    }
    .comparisonsNew ::ng-deep .mat-stepper-horizontal-line {
      border-top-color: rgba(191, 205, 228, 0.85);
    }
    .tableWrap { width: 100%; overflow: auto; }
    table { width: 100%; min-width: 640px; }
    .stepBlock {
      display: grid;
      gap: var(--space-3);
      padding: 12px;
      border-radius: 12px;
      border: 1px solid rgba(191, 205, 228, 0.8);
      background: linear-gradient(180deg, #fcfdff, #f7faff);
    }
    .stepActions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 2px;
    }
    .form { display: grid; gap: var(--space-2); }
    .summary {
      display: grid;
      gap: 8px;
      font-size: var(--font-size-14);
      padding: 12px;
      border-radius: 10px;
      border: 1px solid rgba(191, 205, 228, 0.85);
      background: #fff;
    }

    @media (max-width: 768px) {
      .comparisonsNew ::ng-deep .mat-stepper-label-position-bottom .mat-step-label {
        display: none;
      }
      .tableWrap { border-radius: 10px; }
      table { min-width: 560px; }
      .stepActions {
        flex-direction: column;
      }
      .stepActions button {
        width: 100%;
      }
    }
  `],
})
export class ComparisonsNewPageComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly invoiceService = inject(InvoiceService);
  private readonly comparisonService = inject(ComparisonService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly invoices = signal<Invoice[]>([]);
  readonly isMobile = signal(false);
  readonly selection = new SelectionModel<Invoice>(true, []);
  readonly columns = ['select', 'supplier', 'number', 'total'];

  readonly form = this.fb.group({
    name: ['', Validators.required],
    notes: [''],
    params: ['{}'],
  });

  constructor() {
    this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.isMobile.set(state.matches));

    this.invoiceService.listInvoices({}, 0, 20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => this.invoices.set(res.items),
      error: () => this.snackBar.open('No se pudieron cargar facturas.', 'Cerrar', { duration: 2500 }),
    });
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.invoices().length;
    return numSelected > 0 && numSelected === numRows;
  }

  toggleAll() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.invoices());
  }

  create() {
    const ids = this.selection.selected.map((i) => i.id);
    let params: Record<string, any> = {};
    try {
      params = JSON.parse(this.form.controls.params.value || '{}');
    } catch {
      this.snackBar.open('Parámetros JSON inválidos.', 'Cerrar', { duration: 2500 });
      return;
    }
    this.comparisonService.createComparison({
      invoiceIds: ids,
      params,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (cmp) => {
        this.snackBar.open('Comparación creada.', 'Cerrar', { duration: 2000 });
        this.router.navigate(['/comparisons', cmp.id]);
      },
      error: () => this.snackBar.open('No se pudo crear.', 'Cerrar', { duration: 2500 }),
    });
  }
}
