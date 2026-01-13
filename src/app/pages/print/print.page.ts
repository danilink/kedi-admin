import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Weekday } from '../../models/menu.models';
import { MenuStoreService } from '../../services/menu-store.service';
import { ExportService } from '../../services/export.service';
import { MenuPreviewComponent } from '../../components/menu-preview/menu-preview.component';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';

const WEEKDAYS: Weekday[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

function weekdayFromToday(): Weekday {
  const d = new Date();
  const map: Record<number, Weekday> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes' };
  return map[d.getDay()] ?? 'Lunes';
}

@Component({
  selector: 'app-print-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatTabsModule, MenuPreviewComponent],
  template: `
    <div class="wrap">
      <mat-card>
        <mat-card-title>Versión imprimible</mat-card-title>
        <mat-card-subtitle>Exporta a PDF (A4) o JPG desde el render actual.</mat-card-subtitle>

        <mat-tab-group [selectedIndex]="selectedIndex()" (selectedIndexChange)="onTab($event)">
          @for (d of weekdays; track d) { <mat-tab [label]="d"></mat-tab> }
        </mat-tab-group>

        <div class="actions">
          <button mat-raised-button (click)="print()">Imprimir</button>
          <button mat-raised-button (click)="exportPdf()">Exportar PDF</button>
          <button mat-raised-button (click)="exportJpg()">Exportar JPG</button>
        </div>
      </mat-card>

      <div class="previewWrap">
        <div #capture>
          <app-menu-preview [menu]="menu()" [settings]="settings()"></app-menu-preview>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap { display: grid; gap: 16px; padding: 16px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .previewWrap { display: flex; justify-content: center; padding-bottom: 24px; }
    .previewWrap > div { box-shadow: 0 8px 30px rgba(0,0,0,.12); }

    @media print {
      mat-card, .actions, mat-tab-group { display: none !important; }
      .previewWrap { padding: 0; }
      .previewWrap > div { box-shadow: none; }
    }
  `],
})
export class PrintPageComponent {
  private readonly store = inject(MenuStoreService);
  private readonly exporter = inject(ExportService);

  readonly weekdays = WEEKDAYS;
  readonly selectedDay = signal<Weekday>(weekdayFromToday());
  readonly selectedIndex = computed(() => this.weekdays.indexOf(this.selectedDay()));

  readonly menu = computed(() => this.store.getDay(this.selectedDay())());
  readonly settings = computed(() => this.store.settings());

  @ViewChild('capture', { static: false }) capture?: ElementRef<HTMLDivElement>;

  onTab(index: number) { this.selectedDay.set(this.weekdays[index] ?? 'Lunes'); }
  print() { window.print(); }

  async exportPdf() {
    const el = this.capture?.nativeElement;
    if (!el) return;
    await this.exporter.exportElementToPdfA4(el, `menu-${this.selectedDay().toLowerCase()}-a4.pdf`);
  }

  async exportJpg() {
    const el = this.capture?.nativeElement;
    if (!el) return;
    await this.exporter.exportElementToJpg(el, `menu-${this.selectedDay().toLowerCase()}.jpg`);
  }
}
