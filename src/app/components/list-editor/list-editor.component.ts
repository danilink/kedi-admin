import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

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
  ],
  template: `
    <mat-form-field appearance="outline" class="full">
      <mat-label>{{ label }}</mat-label>

      <mat-chip-grid #grid aria-label="Lista editable">
        @for (ctrl of items.controls; track ctrl; let i = $index) {
          <mat-chip-row (removed)="remove(i)">
            {{ ctrl.value }}
            <button matChipRemove class="removeBtn" aria-label="Quitar">×</button>
          </mat-chip-row>
        }

        <input
          [matChipInputFor]="grid"
          [placeholder]="placeholder"
          [matAutocomplete]="auto"
          [formControl]="inputCtrl"
          (keydown.enter)="addFromInput(); $event.preventDefault()"
          (blur)="addFromInput()"
          (input)="onInput($any($event.target).value)"
        />
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
    .removeBtn {
      border: 0;
      background: transparent;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: #555;
    }
  `],
})
export class ListEditorComponent {
  @Input({ required: true }) items!: FormArray<FormControl<string>>;
  @Input() label = 'Lista';
  @Input() placeholder = 'Añadir…';
  @Input() suggestions: string[] = [];

  inputCtrl = new FormControl<string>('', { nonNullable: true });
  private filterValue = '';

  onInput(value: string) {
    this.filterValue = value ?? '';
  }

  onOptionSelected(value: string) {
    this.inputCtrl.setValue(value);
    this.filterValue = value ?? '';
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
    const raw = this.inputCtrl.value.trim();
    if (!raw) return;

    const parts = raw
      .split(/\r?\n|;/g)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const p of parts) this.items.push(new FormControl<string>(p, { nonNullable: true }));

    this.inputCtrl.setValue('');
    this.items.markAsDirty();
  }

  remove(index: number) {
    this.items.removeAt(index);
    this.items.markAsDirty();
  }
}
