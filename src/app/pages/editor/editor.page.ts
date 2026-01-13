import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { Weekday } from '../../models/menu.models';
import { MenuStoreService } from '../../services/menu-store.service';
import { MenuLibraryService } from '../../services/menu-library.service';
import { ListEditorComponent } from '../../components/list-editor/list-editor.component';

import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

const WEEKDAYS: Weekday[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

function weekdayFromToday(): Weekday {
  const d = new Date();
  const map: Record<number, Weekday> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes' };
  return map[d.getDay()] ?? 'Lunes';
}

type MenuForm = FormGroup<{
  platoDelDia: FormControl<string>;
  precioPlatoDelDia: FormControl<number | null>;
  precioMenu: FormControl<number | null>;
  primeros: FormArray<FormControl<string>>;
  segundos: FormArray<FormControl<string>>;
  postres: FormArray<FormControl<string>>;
  telefono: FormControl<string>;
  notas: FormControl<string>;
}>;

@Component({
  selector: 'app-editor-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    ListEditorComponent,
  ],
  template: `
    <div class="wrap">
      <mat-card>
        <mat-card-title>Configuración del menú diario</mat-card-title>
        <mat-card-subtitle>Se guarda automáticamente en este navegador (localStorage).</mat-card-subtitle>

        <div class="actions">
          <a mat-stroked-button routerLink="/print">Imprimir</a>
          <button mat-stroked-button (click)="resetDay()">Restaurar día</button>
          <button mat-stroked-button (click)="resetAll()">Restaurar todo</button>
        </div>

        <mat-tab-group [selectedIndex]="selectedIndex()" (selectedIndexChange)="onTab($event)">
          @for (d of weekdays; track d) { <mat-tab [label]="d"></mat-tab> }
        </mat-tab-group>

        <form class="form" [formGroup]="form">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Plato del día</mat-label>
            <input matInput formControlName="platoDelDia" />
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline" class="half">
              <mat-label>Precio plato del día (€)</mat-label>
              <input matInput type="number" step="0.01" formControlName="precioPlatoDelDia" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="half">
              <mat-label>Precio menú (€)</mat-label>
              <input matInput type="number" step="0.01" formControlName="precioMenu" />
            </mat-form-field>
          </div>

          <app-list-editor
            [items]="primeros"
            [suggestions]="primerosSuggestions()"
            label="Primeros"
            placeholder="Añadir primer plato…"
          ></app-list-editor>
          <app-list-editor
            [items]="segundos"
            [suggestions]="segundosSuggestions()"
            label="Segundos"
            placeholder="Añadir segundo plato…"
          ></app-list-editor>
          <app-list-editor
            [items]="postres"
            [suggestions]="postresSuggestions()"
            label="Postres caseros"
            placeholder="Añadir postre…"
          ></app-list-editor>

          <mat-divider></mat-divider>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Teléfono / reservas</mat-label>
            <input matInput formControlName="telefono" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Notas internas</mat-label>
            <textarea matInput rows="3" formControlName="notas"></textarea>
          </mat-form-field>
        </form>
      </mat-card>

      <mat-card>
        <mat-card-title>Textos del pie (editables)</mat-card-title>
        <mat-card-subtitle>Se usan en la versión imprimible.</mat-card-subtitle>

        <div class="footerEditor">
          @for (line of footerLines(); track line; let i = $index) {
            <mat-form-field appearance="outline" class="full">
              <mat-label>Línea {{ i + 1 }}</mat-label>
              <input matInput [value]="line" (input)="setFooterLine(i, $any($event.target).value)" />
            </mat-form-field>
          }

          <div class="footerActions">
            <button mat-stroked-button (click)="addFooterLine()">Añadir línea</button>
            <button mat-stroked-button (click)="removeFooterLine()" [disabled]="footerLines().length <= 1">Quitar última</button>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .wrap { display: grid; gap: 16px; padding: 16px; max-width: 1100px; margin: 0 auto; }
    .actions { display: flex; gap: 8px; margin: 8px 0 16px; flex-wrap: wrap; }
    .form { display: grid; gap: 12px; margin-top: 12px; }
    .full { width: 100%; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; }
    .half { flex: 1 1 260px; }
    .footerEditor { margin-top: 12px; }
    .footerActions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  `],
})
export class EditorPageComponent {
  private readonly store = inject(MenuStoreService);
  private readonly library = inject(MenuLibraryService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly weekdays = WEEKDAYS;
  readonly selectedDay = signal<Weekday>(weekdayFromToday());
  readonly selectedIndex = computed(() => this.weekdays.indexOf(this.selectedDay()));

  readonly footerLines = computed(() => this.store.settings().footerLines);
  readonly primerosSuggestions = computed(() => this.library.primeros());
  readonly segundosSuggestions = computed(() => this.library.segundos());
  readonly postresSuggestions = computed(() => this.library.postres());

  readonly form: MenuForm = this.fb.group({
    platoDelDia: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    precioPlatoDelDia: this.fb.control<number | null>(null),
    precioMenu: this.fb.control<number | null>(null),
    primeros: this.fb.array<FormControl<string>>([]),
    segundos: this.fb.array<FormControl<string>>([]),
    postres: this.fb.array<FormControl<string>>([]),
    telefono: this.fb.control('', { nonNullable: true }),
    notas: this.fb.control('', { nonNullable: true }),
  });

  get primeros() { return this.form.controls.primeros; }
  get segundos() { return this.form.controls.segundos; }
  get postres() { return this.form.controls.postres; }

  constructor() {
    this.library.bootstrapFromState(this.store.state());

    effect(() => {
      const day = this.store.getDay(this.selectedDay())();
      this.patchFormFromDay(day);
    });

    this.form.valueChanges
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const patch = this.formToPatch();
        this.store.updateDay(this.selectedDay(), patch);
        this.library.addItems('primeros', patch.primeros ?? []);
        this.library.addItems('segundos', patch.segundos ?? []);
        this.library.addItems('postres', patch.postres ?? []);
      });
  }

  onTab(index: number) {
    this.selectedDay.set(this.weekdays[index] ?? 'Lunes');
  }

  resetAll() { this.store.resetAllToDefaults(); }
  resetDay() { this.store.resetDayToDefaults(this.selectedDay()); }

  addFooterLine() { this.store.updateFooterLines([...this.footerLines(), '']); }

  removeFooterLine() {
    const lines = [...this.footerLines()];
    lines.pop();
    this.store.updateFooterLines(lines);
  }

  setFooterLine(index: number, value: string) {
    const lines = [...this.footerLines()];
    lines[index] = value;
    this.store.updateFooterLines(lines);
  }

  private patchFormFromDay(day: any) {
    this.form.patchValue(
      {
        platoDelDia: day.platoDelDia ?? '',
        precioPlatoDelDia: day.precioPlatoDelDia ?? null,
        precioMenu: day.precioMenu ?? null,
        telefono: day.telefono ?? '',
        notas: day.notas ?? '',
      },
      { emitEvent: false }
    );

    this.setArray(this.primeros, day.primeros ?? []);
    this.setArray(this.segundos, day.segundos ?? []);
    this.setArray(this.postres, day.postres ?? []);
  }

  private setArray(arr: FormArray<FormControl<string>>, values: string[]) {
    arr.clear({ emitEvent: false });
    for (const v of values) arr.push(new FormControl<string>(v, { nonNullable: true }), { emitEvent: false });
  }

  private formToPatch() {
    const v = this.form.getRawValue();
    return {
      platoDelDia: v.platoDelDia,
      precioPlatoDelDia: v.precioPlatoDelDia,
      precioMenu: v.precioMenu,
      primeros: v.primeros,
      segundos: v.segundos,
      postres: v.postres,
      telefono: v.telefono,
      notas: v.notas,
    };
  }
}
