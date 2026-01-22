import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

import { Weekday } from '../../models/menu.models';
import { MenuStoreService } from '../../services/menu-store.service';
import { MenuLibraryService } from '../../services/menu-library.service';
import { PublishService } from '../../services/publish.service';
import { ListEditorComponent } from '../../components/list-editor/list-editor.component';

import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

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
    MatIconModule,
    ListEditorComponent,
  ],
  template: `
    <div class="wrap">
      <mat-card>
        <div class="pageHeader">
          <div class="pageHeaderTitle">Configuración del menú diario</div>
          <div class="pageHeaderSubtitle">Se guarda automáticamente en este navegador (localStorage).</div>
        </div>

        <div class="actions">
          <a mat-raised-button color="primary" routerLink="/print">
            <mat-icon>print</mat-icon>
            Imprimir
          </a>
        </div>
        @if (publishStatus()) {
          <div class="publishStatus">{{ publishStatus() }}</div>
        }

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

          <div class="listBlock">
            <div class="listHeader">
              <div class="listTitle">Primeros</div>
              <div class="listActions">
                <button mat-stroked-button class="listClear" (click)="clearList(primeros, 'primeros')">
                  <mat-icon>delete_sweep</mat-icon>
                  Borrar
                </button>
                @if (canUndo('primeros')) {
                  <button
                    mat-stroked-button
                    class="listUndo"
                    (click)="undoClear(primeros, 'primeros')"
                  >
                    <mat-icon>undo</mat-icon>
                    Deshacer
                  </button>
                }
              </div>
            </div>
            <app-list-editor
              [items]="primeros"
              [suggestions]="primerosSuggestions()"
              label="Primeros"
              placeholder="Añadir primer plato…"
            ></app-list-editor>
          </div>

          <div class="listBlock">
            <div class="listHeader">
              <div class="listTitle">Segundos</div>
              <div class="listActions">
                <button mat-stroked-button class="listClear" (click)="clearList(segundos, 'segundos')">
                  <mat-icon>delete_sweep</mat-icon>
                  Borrar
                </button>
                @if (canUndo('segundos')) {
                  <button
                    mat-stroked-button
                    class="listUndo"
                    (click)="undoClear(segundos, 'segundos')"
                  >
                    <mat-icon>undo</mat-icon>
                    Deshacer
                  </button>
                }
              </div>
            </div>
            <app-list-editor
              [items]="segundos"
              [suggestions]="segundosSuggestions()"
              label="Segundos"
              placeholder="Añadir segundo plato…"
            ></app-list-editor>
          </div>

          <div class="listBlock">
            <div class="listHeader">
              <div class="listTitle">Postres caseros</div>
              <div class="listActions">
                <button mat-stroked-button class="listClear" (click)="clearList(postres, 'postres')">
                  <mat-icon>delete_sweep</mat-icon>
                  Borrar
                </button>
                @if (canUndo('postres')) {
                  <button
                    mat-stroked-button
                    class="listUndo"
                    (click)="undoClear(postres, 'postres')"
                  >
                    <mat-icon>undo</mat-icon>
                    Deshacer
                  </button>
                }
              </div>
            </div>
            <app-list-editor
              [items]="postres"
              [suggestions]="postresSuggestions()"
              label="Postres caseros"
              placeholder="Añadir postre…"
            ></app-list-editor>
          </div>

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
            <button mat-stroked-button (click)="addFooterLine()">
              <mat-icon>add</mat-icon>
              Añadir línea
            </button>
            <button mat-stroked-button (click)="removeFooterLine()" [disabled]="footerLines().length <= 1">
              <mat-icon>remove</mat-icon>
              Quitar última
            </button>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .wrap { display: grid; gap: 16px; width: 100%; max-width: none; margin: 0; padding: 16px; }
    .actions { display: flex; gap: 8px; margin: 8px 0 16px; flex-wrap: wrap; }
    .form { display: grid; gap: 12px; margin-top: 16px; }
    .publishStatus { margin-top: 8px; font-size: 12px; color: var(--color-muted); }
    .full { width: 100%; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; }
    .half { flex: 1 1 260px; }
    .listBlock { display: grid; gap: 8px; }
    .listHeader {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-weight: 600;
    }
    .listTitle { font-size: 14px; color: var(--color-text); }
    .listClear { height: 36px; }
    .listActions { display: flex; gap: 8px; flex-wrap: wrap; }
    .footerEditor { margin-top: 12px; }
    .footerActions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }

    @media (max-width: 768px) {
      .actions { flex-direction: column; align-items: stretch; }
    }
  `],
})
export class EditorPageComponent {
  private readonly store = inject(MenuStoreService);
  private readonly library = inject(MenuLibraryService);
  private readonly publisher = inject(PublishService);
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

  readonly publishStatus = signal('');
  readonly isPublishing = signal(false);

  private lastCleared: Record<'primeros' | 'segundos' | 'postres', string[]> = {
    primeros: [],
    segundos: [],
    postres: [],
  };

  get primeros() { return this.form.controls.primeros; }
  get segundos() { return this.form.controls.segundos; }
  get postres() { return this.form.controls.postres; }

  constructor() {
    void this.store.loadFromSheets();
    void this.library.loadFromSheets().then(() => {
      this.library.bootstrapFromState(this.store.state());
    });

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

    this.form.valueChanges
      .pipe(debounceTime(600), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.syncToWeb();
      });
  }

  onTab(index: number) {
    this.selectedDay.set(this.weekdays[index] ?? 'Lunes');
  }

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

  private async syncToWeb() {
    if (this.isPublishing()) return;
    this.isPublishing.set(true);
    this.publishStatus.set('Sincronizando con la web…');

    const v = this.form.getRawValue();
    const payload = {
      weekday: this.selectedDay(),
      platoDelDia: v.platoDelDia,
      precioPlatoDelDia: v.precioPlatoDelDia,
      precioMenu: v.precioMenu,
      primeros: v.primeros ?? [],
      segundos: v.segundos ?? [],
      postres: v.postres ?? [],
      telefono: v.telefono ?? '',
      notas: v.notas ?? '',
    };

    try {
      const res = await firstValueFrom(this.publisher.publishDay(payload));
      this.publishStatus.set(res?.ok ? 'Sincronizado con la web.' : (res?.error || 'Error al sincronizar.'));
    } catch (err: any) {
      this.publishStatus.set(err?.message || 'Error al sincronizar.');
    } finally {
      this.isPublishing.set(false);
    }
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

  private setArray(arr: FormArray<FormControl<string>>, values: string[], emitEvent = false) {
    arr.clear({ emitEvent });
    for (const v of values) arr.push(new FormControl<string>(v, { nonNullable: true }), { emitEvent });
  }

  clearList(arr: FormArray<FormControl<string>>, key: 'primeros' | 'segundos' | 'postres') {
    this.lastCleared[key] = [...arr.getRawValue()];
    arr.clear();
    arr.markAsDirty();
  }

  undoClear(arr: FormArray<FormControl<string>>, key: 'primeros' | 'segundos' | 'postres') {
    const values = this.lastCleared[key];
    if (!values.length) return;
    this.setArray(arr, values, true);
    arr.markAsDirty();
  }

  canUndo(key: 'primeros' | 'segundos' | 'postres') {
    return this.lastCleared[key].length > 0;
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
