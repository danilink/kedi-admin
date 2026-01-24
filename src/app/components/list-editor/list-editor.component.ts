import { Component, ElementRef, Input, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-list-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    DragDropModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="full">
      <mat-label>{{ label }}</mat-label>

      <mat-chip-grid
        #grid
        aria-label="Lista editable"
        class="chipGrid"
        cdkDropList
        cdkDropListOrientation="horizontal"
        (cdkDropListDropped)="drop($event)"
        (click)="onGridClick()"
      >
        @for (ctrl of items.controls; track ctrl; let i = $index) {
          <mat-chip-row cdkDrag (removed)="remove(i)">
            {{ ctrl.value }}
            <button matChipRemove type="button" class="removeBtn" aria-label="Quitar" (click)="remove(i)">
              <mat-icon>close</mat-icon>
            </button>
          </mat-chip-row>
        }

        @if (showInput()) {
          <input
            #inputEl
            [matChipInputFor]="grid"
            [placeholder]="placeholder"
            [matAutocomplete]="auto"
            [formControl]="inputCtrl"
            (keydown.enter)="onEnter($event)"
            (blur)="addFromInput()"
            (input)="onInput($any($event.target).value)"
          />
        }
      </mat-chip-grid>

      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onOptionSelected($event.option.value)">
        @for (option of filteredSuggestions(); track option) {
          <mat-option [value]="option">{{ option }}</mat-option>
        }
      </mat-autocomplete>

      <mat-hint>Enter para añadir. Puedes pegar texto con “;” o saltos de línea.</mat-hint>
    </mat-form-field>
  `,
  styles: [`
    .full { width: 100%; }
    .chipGrid {
      min-height: 44px;
      cursor: text;
      padding: 4px 4px 6px;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.6);
    }
    mat-chip-row {
      cursor: grab;
      border-radius: 999px;
      background: rgba(107, 75, 50, 0.1);
      font-weight: var(--font-weight-medium);
    }
    mat-chip-row:active { cursor: grabbing; }
    .removeBtn {
      border: 0;
      background: transparent;
      padding: 0;
      line-height: 1;
      cursor: pointer;
      color: var(--color-muted);
    }
    .removeBtn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `],
})
export class ListEditorComponent {
  @Input({ required: true }) items!: FormArray<FormControl<string>>;
  @Input() label = 'Lista';
  @Input() placeholder = 'Añadir…';
  @Input() suggestions: string[] = [];

  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger?: MatAutocompleteTrigger;
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>;

  inputCtrl = new FormControl<string>('', { nonNullable: true });
  private filterValue = '';
  readonly showInput = signal(true);

  onInput(value: string) {
    this.filterValue = value ?? '';
  }

  onOptionSelected(value: string) {
    if (!value) return;
    this.addValue(value);
    this.inputCtrl.setValue('');
    this.filterValue = '';
    this.autocompleteTrigger?.closePanel();
    this.hideInput();
  }

  onEnter(event: KeyboardEvent) {
    if (this.autocompleteTrigger?.panelOpen) return;
    this.addFromInput();
    event.preventDefault();
  }

  filteredSuggestions() {
    const q = this.filterValue.trim().toLowerCase();
    const existing = new Set(this.items.controls.map((c) => c.value.trim().toLowerCase()));
    return this.suggestions.filter((s) => {
      const normalized = s.trim().toLowerCase();
      if (!normalized || existing.has(normalized)) return false;
      return q ? normalized.includes(q) : true;
    });
  }

  addFromInput() {
    if (this.autocompleteTrigger?.panelOpen) return;
    const raw = this.inputCtrl.value.trim();
    if (!raw) return;

    const parts = raw
      .split(/\r?\n|;/g)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const p of parts) this.addValue(p);

    this.inputCtrl.setValue('');
    this.items.markAsDirty();
    this.hideInput();
  }

  remove(index: number) {
    this.items.removeAt(index);
    this.items.markAsDirty();
  }

  private addValue(value: string) {
    this.items.push(new FormControl<string>(value, { nonNullable: true }));
  }

  drop(event: CdkDragDrop<FormControl<string>[]>) {
    if (event.previousIndex === event.currentIndex) return;
    const control = this.items.at(event.previousIndex);
    this.items.removeAt(event.previousIndex);
    this.items.insert(event.currentIndex, control);
    this.items.markAsDirty();
  }

  onGridClick() {
    if (this.showInput()) return;
    this.showInput.set(true);
    queueMicrotask(() => this.inputEl?.nativeElement.focus());
  }

  private hideInput() {
    this.showInput.set(false);
  }
}
