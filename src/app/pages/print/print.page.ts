import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Weekday } from '../../models/menu.models';
import { MenuStoreService } from '../../services/menu-store.service';
import { ExportService } from '../../services/export.service';
import { MenuPreviewComponent } from '../../components/menu-preview/menu-preview.component';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

const WEEKDAYS: Weekday[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

function weekdayFromToday(): Weekday {
  const d = new Date();
  const map: Record<number, Weekday> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes' };
  return map[d.getDay()] ?? 'Lunes';
}

@Component({
  selector: 'app-print-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatTabsModule, MatIconModule, MenuPreviewComponent],
  template: `
    <div class="wrap">
      <mat-card>
        <div class="pageHeader">
          <div class="pageHeaderTitle">Versión imprimible</div>
          <div class="pageHeaderSubtitle">Exporta a PDF (A4) o JPG desde el render actual.</div>
        </div>

        <mat-tab-group [selectedIndex]="selectedIndex()" (selectedIndexChange)="onTab($event)">
          @for (d of weekdays; track d) { <mat-tab [label]="d"></mat-tab> }
        </mat-tab-group>

        <div class="actions">
          <button mat-raised-button color="primary" class="printBtn" (click)="print()">
            <mat-icon>print</mat-icon>
            Imprimir
          </button>
          <button mat-stroked-button (click)="exportPdf()">
            <mat-icon>picture_as_pdf</mat-icon>
            Exportar PDF
          </button>
          <button mat-stroked-button (click)="exportJpg()">
            <mat-icon>image</mat-icon>
            Exportar JPG
          </button>
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
    .wrap { display: grid; gap: 16px; padding: 8px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .previewWrap { display: flex; justify-content: center; padding-bottom: 24px; }
    .previewWrap > div { box-shadow: 0 12px 32px rgba(16, 24, 40, 0.18); border-radius: 8px; overflow: hidden; }
    .printBtn {
      background: var(--color-primary-500);
      color: #fff;
      --mdc-filled-button-container-color: var(--color-primary-500);
      --mdc-filled-button-label-text-color: #fff;
      --mat-button-protected-container-color: var(--color-primary-500);
      --mat-button-protected-label-text-color: #fff;
    }
    .printBtn:hover { background: var(--color-primary-600); }
    .printBtn:active { background: var(--color-primary-700); }

    @media print {
      mat-card, .actions, mat-tab-group { display: none !important; }
      .previewWrap { padding: 0; }
      .previewWrap > div { box-shadow: none; }
    }

    @media (max-width: 768px) {
      .actions { flex-direction: column; align-items: stretch; }
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
  async print() {
    const el = this.capture?.nativeElement;
    if (!el) return;
    await this.exporter.printElementToPdfA4(el, `menu-${this.selectedDay().toLowerCase()}-a4.pdf`);
  }

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
