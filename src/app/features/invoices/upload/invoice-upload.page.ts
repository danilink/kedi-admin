import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UploadItemDto } from '../../../models/invoice.models';
import { UploadService } from '../../../services/upload.service';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 15 * 1024 * 1024;

@Component({
  selector: 'app-invoice-upload-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="container upload">
      <div class="pageHeader">
        <div class="pageEyebrow">Facturas</div>
        <div class="pageHeaderTitle">Importar facturas</div>
        <div class="pageHeaderSubtitle">Arrastra PDFs o imágenes y revisa el estado de cada carga.</div>
      </div>

      <mat-card class="surfaceCard">
        <div
          class="dropZone"
          role="button"
          tabindex="0"
          aria-label="Zona de subida de facturas"
          (drop)="onDrop($event)"
          (dragover)="onDragOver($event)"
          (keydown.enter)="openFilePicker()"
          (keydown.space)="openFilePicker()"
        >
          <mat-icon>cloud_upload</mat-icon>
          <div>
            <div class="dropTitle">Arrastra y suelta PDFs o imágenes</div>
            <div class="dropSub">Máx. 15MB por archivo. PDF/JPG/PNG.</div>
          </div>
          <label class="uploadBtn" mat-raised-button color="primary">
            <input #fileInput type="file" multiple (change)="onFileSelected($event)" accept=".pdf,.jpg,.jpeg,.png" />
            Seleccionar archivos
          </label>
        </div>

        @if (uploads().length) {
          <div class="uploadList">
            @for (item of uploads(); track item.id) {
              <div class="uploadItem">
                <div>
                  <div class="uploadName">{{ item.name }}</div>
                  <div class="uploadMeta">{{ item.size / 1024 | number:'1.0-0' }} KB · {{ item.type || 'archivo' }}</div>
                </div>
                <div class="uploadStatus">
                  <mat-progress-bar [value]="item.progress" mode="determinate"></mat-progress-bar>
                  <span class="statusText">{{ item.status }}</span>
                  @if (item.warnings?.length) {
                    <div class="warningText">{{ item.warnings.join(' · ') }}</div>
                  }
                </div>
                <div class="uploadActions">
                  @if (item.invoiceId) {
                    <a mat-stroked-button color="primary" [routerLink]="['/invoices', item.invoiceId]">Ver factura</a>
                  }
                  <button mat-icon-button (click)="cancel(item)" [disabled]="item.status === 'uploaded'">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .upload { display: grid; gap: var(--space-4); padding-bottom: var(--space-6); }
    .dropZone {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
      border-radius: var(--radius-md);
      border: 1px dashed var(--color-border-strong);
      background: var(--color-surface-2);
      cursor: pointer;
    }
    .dropZone mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .dropTitle { font-weight: var(--font-weight-medium); }
    .dropSub { font-size: var(--font-size-12); color: var(--color-muted); }
    .uploadBtn input { display: none; }
    .uploadList { margin-top: var(--space-3); display: grid; gap: var(--space-2); }
    .uploadItem {
      display: grid;
      grid-template-columns: 1fr minmax(160px, 220px) auto;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2);
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
    }
    .uploadName { font-weight: var(--font-weight-medium); }
    .uploadMeta { font-size: var(--font-size-12); color: var(--color-muted); }
    .uploadStatus { display: grid; gap: 4px; }
    .statusText { font-size: var(--font-size-12); color: var(--color-muted); text-transform: uppercase; }
    .warningText { font-size: var(--font-size-11); color: var(--color-danger-500); }
    .uploadActions { display: flex; align-items: center; gap: 8px; }

    @media (max-width: 720px) {
      .dropZone { grid-template-columns: 1fr; justify-items: start; }
      .uploadItem { grid-template-columns: 1fr; }
    }
  `],
})
export class InvoiceUploadPageComponent {
  private readonly uploadService = inject(UploadService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly uploads = signal<UploadItemDto[]>([]);
  private pending = new Set<string>();

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.handleFiles(files);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.handleFiles(files);
    input.value = '';
  }

  openFilePicker() {
    this.fileInput?.nativeElement.click();
  }

  cancel(item: UploadItemDto) {
    this.uploadService.cancelUpload(item.id);
    this.updateUpload(item.id, { status: 'canceled', progress: item.progress });
    this.pending.delete(item.id);
  }

  private handleFiles(files: File[]) {
    const valid = files.filter((file) => this.validateFile(file));
    if (!valid.length) return;
    for (const file of valid) {
      this.uploadService.createUpload(file)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((item) => {
          this.pending.add(item.id);
          this.upsertUpload(item);
          if (item.status === 'uploaded' || item.status === 'error') {
            this.pending.delete(item.id);
            this.checkSummary();
          }
        });
    }
  }

  private validateFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.snackBar.open(`Tipo no permitido: ${file.name}`, 'Cerrar', { duration: 3000 });
      return false;
    }
    if (file.size > MAX_SIZE) {
      this.snackBar.open(`Archivo demasiado grande: ${file.name}`, 'Cerrar', { duration: 3000 });
      return false;
    }
    return true;
  }

  private checkSummary() {
    if (this.pending.size > 0) return;
    const list = this.uploads();
    const ok = list.filter((i) => i.status === 'uploaded').length;
    const err = list.filter((i) => i.status === 'error').length;
    this.snackBar.open(`Subidas completadas: ${ok} OK · ${err} error`, 'Cerrar', { duration: 3500 });
  }

  private upsertUpload(item: UploadItemDto) {
    const list = [...this.uploads()];
    const index = list.findIndex((u) => u.id === item.id);
    if (index >= 0) list[index] = { ...list[index], ...item };
    else list.unshift(item);
    this.uploads.set(list);
  }

  private updateUpload(id: string, patch: Partial<UploadItemDto>) {
    const list = this.uploads().map((u) => (u.id === id ? { ...u, ...patch } : u));
    this.uploads.set(list);
  }
}
