import { AfterViewInit, Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, merge, startWith, switchMap, tap, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { InvoiceDto, InvoiceFilters, InvoiceStatus } from '../../models/invoice.models';
import { InvoicesService } from '../../services/invoices.service';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';

const STATUS_OPTIONS: Array<{ value: InvoiceStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'uploaded', label: 'Subida' },
  { value: 'processing', label: 'Procesando' },
  { value: 'parsed', label: 'Procesada' },
  { value: 'error', label: 'Error' },
];

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  template: `
    <div class="container invoices">
      <div class="pageHeader">
        <div class="pageEyebrow">Facturas</div>
        <div class="pageHeaderTitle">Listado general</div>
        <div class="pageHeaderSubtitle">Gestiona y revisa facturas procesadas por OCR.</div>
      </div>

      <mat-card class="surfaceCard">
        <div class="filterActions">
          <button mat-stroked-button (click)="resetFilters()">
            <mat-icon>restart_alt</mat-icon>
            Limpiar filtros
          </button>
          <div class="resultMeta">{{ total() }} facturas</div>
        </div>

        @if (loading()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <div class="skeletonTable" aria-hidden="true">
            @for (row of skeletonRows; track row) {
              <div class="skeletonRow"></div>
            }
          </div>
        }

        @if (error()) {
          <div class="stateBlock error">
            <mat-icon>error</mat-icon>
            <div>
              <div class="stateTitle">Error al cargar facturas</div>
              <div class="stateSubtitle">{{ error() }}</div>
            </div>
            <button mat-stroked-button (click)="reload()">Reintentar</button>
          </div>
        } @else if (!loading() && dataSource.data.length === 0) {
          <div class="stateBlock empty">
            <mat-icon>inbox</mat-icon>
            <div>
              <div class="stateTitle">No hay facturas</div>
              <div class="stateSubtitle">Ajusta los filtros o sube nuevas facturas.</div>
            </div>
            <a mat-raised-button color="primary" routerLink="/invoice-compare">Comparar facturas</a>
          </div>
        }

        <div class="tableWrap" [class.is-loading]="loading()">
          <table mat-table [dataSource]="dataSource" matSort class="mat-elevation-z0">
            <ng-container matColumnDef="number">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>
                <div class="headerCell">
                  <span>Número</span>
                  <button mat-icon-button class="filterBtn" (click)="toggleFilter('number', $event)" aria-label="Filtrar por número">
                    <mat-icon>{{ isFilterVisible('number') ? 'filter_alt_off' : 'filter_alt' }}</mat-icon>
                  </button>
                </div>
              </th>
              <td mat-cell *matCellDef="let row">{{ row.number }}</td>
            </ng-container>

            <ng-container matColumnDef="vendor">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>
                <div class="headerCell">
                  <span>Proveedor</span>
                  <button mat-icon-button class="filterBtn" (click)="toggleFilter('vendor', $event)" aria-label="Filtrar por proveedor">
                    <mat-icon>{{ isFilterVisible('vendor') ? 'filter_alt_off' : 'filter_alt' }}</mat-icon>
                  </button>
                </div>
              </th>
              <td mat-cell *matCellDef="let row">
                <div class="vendor">{{ row.vendor }}</div>
                <div class="file">{{ row.originalFileName }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="issueDate">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>
                <div class="headerCell">
                  <span>Fecha</span>
                  <button mat-icon-button class="filterBtn" (click)="toggleFilter('issueDate', $event)" aria-label="Filtrar por fecha">
                    <mat-icon>{{ isFilterVisible('issueDate') ? 'filter_alt_off' : 'filter_alt' }}</mat-icon>
                  </button>
                </div>
              </th>
              <td mat-cell *matCellDef="let row">{{ row.issueDate | date:'dd/MM/yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>
                <div class="headerCell">
                  <span>Estado</span>
                  <button mat-icon-button class="filterBtn" (click)="toggleFilter('status', $event)" aria-label="Filtrar por estado">
                    <mat-icon>{{ isFilterVisible('status') ? 'filter_alt_off' : 'filter_alt' }}</mat-icon>
                  </button>
                </div>
              </th>
              <td mat-cell *matCellDef="let row">
                <mat-chip [class]="'statusChip ' + row.status">{{ statusLabel(row.status) }}</mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>
                <div class="headerCell">
                  <span>Total</span>
                  <button mat-icon-button class="filterBtn" (click)="toggleFilter('total', $event)" aria-label="Filtrar por total">
                    <mat-icon>{{ isFilterVisible('total') ? 'filter_alt_off' : 'filter_alt' }}</mat-icon>
                  </button>
                </div>
              </th>
              <td mat-cell *matCellDef="let row">{{ row.total | number:'1.2-2' }} {{ row.currency }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>
                <div class="headerCell">
                  <span>Acciones</span>
                  <button mat-icon-button class="filterBtn" (click)="toggleFilter('actions', $event)" aria-label="Filtrar por moneda">
                    <mat-icon>{{ isFilterVisible('actions') ? 'filter_alt_off' : 'filter_alt' }}</mat-icon>
                  </button>
                </div>
              </th>
              <td mat-cell *matCellDef="let row">
                <div class="actions">
                  <a mat-icon-button [routerLink]="['/invoices', row.id]" matTooltip="Ver detalle">
                    <mat-icon>visibility</mat-icon>
                  </a>
                  <button mat-icon-button (click)="download(row)" matTooltip="Descargar original">
                    <mat-icon>download</mat-icon>
                  </button>
                  <button mat-icon-button (click)="retry(row)" [disabled]="row.status !== 'error'" matTooltip="Reintentar extracción">
                    <mat-icon>refresh</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="confirmDelete(row)" matTooltip="Eliminar">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="filterNumber">
              <th mat-header-cell *matHeaderCellDef>
                @if (isFilterVisible('number')) {
                  <mat-form-field appearance="outline" class="filterField">
                    <mat-label>Texto</mat-label>
                    <input matInput [formControl]="form.controls.query" placeholder="Número…" />
                  </mat-form-field>
                }
              </th>
            </ng-container>
            <ng-container matColumnDef="filterVendor">
              <th mat-header-cell *matHeaderCellDef>
                @if (isFilterVisible('vendor')) {
                  <mat-form-field appearance="outline" class="filterField">
                    <mat-label>Proveedor</mat-label>
                    <input matInput [formControl]="form.controls.vendor" placeholder="Buscar…" />
                  </mat-form-field>
                }
              </th>
            </ng-container>
            <ng-container matColumnDef="filterDate">
              <th mat-header-cell *matHeaderCellDef>
                @if (isFilterVisible('issueDate')) {
                  <div class="filterRange">
                    <mat-form-field appearance="outline" class="filterField">
                      <mat-label>Desde</mat-label>
                      <input matInput [matDatepicker]="pickerFrom" [formControl]="form.controls.dateFrom" />
                      <mat-datepicker-toggle matIconSuffix [for]="pickerFrom"></mat-datepicker-toggle>
                      <mat-datepicker #pickerFrom></mat-datepicker>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="filterField">
                      <mat-label>Hasta</mat-label>
                      <input matInput [matDatepicker]="pickerTo" [formControl]="form.controls.dateTo" />
                      <mat-datepicker-toggle matIconSuffix [for]="pickerTo"></mat-datepicker-toggle>
                      <mat-datepicker #pickerTo></mat-datepicker>
                    </mat-form-field>
                  </div>
                }
              </th>
            </ng-container>
            <ng-container matColumnDef="filterStatus">
              <th mat-header-cell *matHeaderCellDef>
                @if (isFilterVisible('status')) {
                  <mat-form-field appearance="outline" class="filterField">
                    <mat-label>Estado</mat-label>
                    <mat-select [formControl]="form.controls.status">
                      @for (opt of statusOptions; track opt.value) {
                        <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                }
              </th>
            </ng-container>
            <ng-container matColumnDef="filterTotal">
              <th mat-header-cell *matHeaderCellDef>
                @if (isFilterVisible('total')) {
                  <div class="filterRange">
                    <mat-form-field appearance="outline" class="filterField">
                      <mat-label>Mín</mat-label>
                      <input matInput type="number" [formControl]="form.controls.totalMin" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="filterField">
                      <mat-label>Máx</mat-label>
                      <input matInput type="number" [formControl]="form.controls.totalMax" />
                    </mat-form-field>
                  </div>
                }
              </th>
            </ng-container>
            <ng-container matColumnDef="filterActions">
              <th mat-header-cell *matHeaderCellDef>
                @if (isFilterVisible('actions')) {
                  <mat-form-field appearance="outline" class="filterField">
                    <mat-label>Moneda</mat-label>
                    <mat-select [formControl]="form.controls.currency">
                      <mat-option value="">Todas</mat-option>
                      <mat-option value="EUR">EUR</mat-option>
                      <mat-option value="USD">USD</mat-option>
                    </mat-select>
                  </mat-form-field>
                }
              </th>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-header-row
              *matHeaderRowDef="filterColumns"
              class="filterRow"
              [class.is-hidden]="!anyFiltersVisible()"
            ></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>

        <mat-paginator [length]="total()" [pageSize]="10" [pageSizeOptions]="[10, 20, 50]" showFirstLastButtons></mat-paginator>
      </mat-card>
    </div>
  `,
  styles: [`
    .invoices { display: grid; gap: var(--space-5); padding-bottom: var(--space-6); }
    .filterActions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: var(--space-3) 0;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .resultMeta { color: var(--color-muted); font-size: var(--font-size-12); }
    .tableWrap { width: 100%; overflow: auto; }
    .tableWrap.is-loading { opacity: 0.6; pointer-events: none; }
    table { width: 100%; min-width: 860px; }
    .skeletonTable { display: grid; gap: 8px; margin: 12px 0; }
    .skeletonRow {
      height: 44px;
      border-radius: var(--radius-sm);
      background: linear-gradient(90deg, rgba(220, 226, 236, 0.2), rgba(220, 226, 236, 0.5), rgba(220, 226, 236, 0.2));
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
    }
    .vendor { font-weight: var(--font-weight-medium); }
    .file { font-size: var(--font-size-12); color: var(--color-muted); }
    .actions { display: inline-flex; gap: 4px; }
    .headerCell { display: inline-flex; align-items: center; gap: 6px; }
    .filterBtn { width: 28px; height: 28px; }
    .filterBtn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .filterRow th { padding: 4px 8px 12px; vertical-align: top; }
    .filterRow.is-hidden { display: none; }
    .filterField { width: 100%; }
    .filterRange { display: grid; gap: 6px; }
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
    .stateBlock mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .stateTitle { font-weight: var(--font-weight-bold); }
    .stateSubtitle { color: var(--color-muted); font-size: var(--font-size-12); }
    .statusChip { font-weight: var(--font-weight-medium); text-transform: capitalize; }
    .statusChip.uploaded { background: rgba(124, 135, 152, 0.2); color: var(--color-muted); }
    .statusChip.processing { background: rgba(47, 129, 237, 0.15); color: #2f6ad1; }
    .statusChip.parsed { background: rgba(47, 143, 75, 0.15); color: var(--color-success-500); }
    .statusChip.error { background: rgba(179, 38, 30, 0.15); color: var(--color-danger-500); }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 768px) {
      .filterActions { align-items: stretch; }
      .filterActions button { width: 100%; }
    }
  `],
})
export class InvoicesListComponent implements AfterViewInit {
  private readonly invoices = inject(InvoicesService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly statusOptions = STATUS_OPTIONS;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly total = signal(0);
  readonly filterVisibility = signal({
    number: false,
    vendor: false,
    issueDate: false,
    status: false,
    total: false,
    actions: false,
  });
  readonly anyFiltersVisible = computed(() => {
    const v = this.filterVisibility();
    return v.number || v.vendor || v.issueDate || v.status || v.total || v.actions;
  });

  readonly form = this.fb.group({
    vendor: [''],
    status: ['all'],
    dateFrom: [null as Date | null],
    dateTo: [null as Date | null],
    totalMin: [null as number | null],
    totalMax: [null as number | null],
    currency: [''],
    query: [''],
  });

  readonly dataSource = new MatTableDataSource<InvoiceDto>([]);
  readonly displayedColumns = ['number', 'vendor', 'issueDate', 'status', 'total', 'actions'];
  readonly filterColumns = ['filterNumber', 'filterVendor', 'filterDate', 'filterStatus', 'filterTotal', 'filterActions'];
  readonly skeletonRows = Array.from({ length: 6 }, (_, i) => i);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  ngAfterViewInit(): void {
    if (this.sort) this.dataSource.sort = this.sort;
    if (this.paginator) this.dataSource.paginator = this.paginator;

    const sort$ = this.sort?.sortChange.pipe(
      startWith({ active: 'issueDate', direction: 'desc' })
    );
    const page$ = this.paginator?.page.pipe(
      startWith({ pageIndex: 0, pageSize: 10 })
    );
    const filters$ = this.form.valueChanges.pipe(startWith(this.form.getRawValue()), debounceTime(200));

    if (!sort$ || !page$) return;

    merge(sort$, page$, filters$)
      .pipe(
        tap((event) => {
          if ('active' in event || 'vendor' in event) this.paginator!.pageIndex = 0;
        }),
        switchMap(() => this.load()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  reload() {
    this.load().subscribe();
  }

  resetFilters() {
    this.form.reset({
      vendor: '',
      status: 'all',
      dateFrom: null,
      dateTo: null,
      totalMin: null,
      totalMax: null,
      currency: '',
      query: '',
    });
  }

  toggleFilter(key: keyof ReturnType<typeof this.filterVisibility>, event?: Event) {
    event?.stopPropagation();
    const current = this.filterVisibility();
    this.filterVisibility.set({ ...current, [key]: !current[key] });
  }

  isFilterVisible(key: keyof ReturnType<typeof this.filterVisibility>) {
    return this.filterVisibility()[key];
  }

  statusLabel(status: InvoiceStatus) {
    return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  }

  download(row: InvoiceDto) {
    if (!row.originalUrl) {
      this.snackBar.open('No hay fichero original disponible.', 'Cerrar', { duration: 3000 });
      return;
    }
    window.open(row.originalUrl, '_blank');
  }

  retry(row: InvoiceDto) {
    this.invoices.retryExtraction(row.id).subscribe({
      next: () => {
        this.snackBar.open('Reintento iniciado.', 'Cerrar', { duration: 2500 });
        this.load().subscribe();
      },
      error: () => this.snackBar.open('No se pudo reintentar.', 'Cerrar', { duration: 2500 }),
    });
  }

  confirmDelete(row: InvoiceDto) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar factura',
        message: `Se eliminará la factura ${row.number}. Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.invoices.delete(row.id).subscribe({
        next: () => {
          this.snackBar.open('Factura eliminada.', 'Cerrar', { duration: 2500 });
          this.load().subscribe();
        },
        error: () => this.snackBar.open('No se pudo eliminar.', 'Cerrar', { duration: 2500 }),
      });
    });
  }

  private load() {
    const filters = this.form.getRawValue();
    const payload: InvoiceFilters = {
      vendor: filters.vendor || undefined,
      status: (filters.status as InvoiceStatus | 'all') || 'all',
      dateFrom: filters.dateFrom ? this.toIso(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? this.toIso(filters.dateTo) : undefined,
      totalMin: filters.totalMin ?? undefined,
      totalMax: filters.totalMax ?? undefined,
      currency: filters.currency || undefined,
      query: filters.query || undefined,
    };

    this.loading.set(true);
    this.error.set('');

    return this.invoices
      .list(payload, this.paginator?.pageIndex ?? 0, this.paginator?.pageSize ?? 10, {
        active: (this.sort?.active as keyof InvoiceDto) ?? 'issueDate',
        direction: this.sort?.direction ?? 'desc',
      })
      .pipe(
        tap((res) => {
          this.dataSource.data = res.items;
          this.total.set(res.total);
          this.loading.set(false);
        }),
        catchError((err) => {
          this.loading.set(false);
          this.error.set(err?.message ?? 'Error desconocido');
          return of(null);
        })
      );
  }

  private toIso(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
