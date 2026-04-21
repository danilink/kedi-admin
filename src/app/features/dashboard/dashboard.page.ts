import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

type ActivityItem = {
  title: string;
  subtitle: string;
  status: 'ok' | 'pending' | 'error';
  link?: string;
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <div class="container dashboard">
      <div class="pageHeader">
        <div class="pageEyebrow">Dashboard</div>
        <div class="pageHeaderTitle">Control de facturas</div>
        <div class="pageHeaderSubtitle">Resumen operativo de los últimos 30 días.</div>
      </div>

      <div class="kpiGrid">
        @for (card of kpis(); track card.label) {
          <mat-card class="surfaceCard kpiCard">
            <div class="kpiTop">
              <div class="kpiLabel">{{ card.label }}</div>
              <div class="kpiIcon">
                <mat-icon>{{ card.icon }}</mat-icon>
              </div>
            </div>
            <div class="kpiValue">{{ card.value }}</div>
            <div class="kpiSub">{{ card.sub }}</div>
          </mat-card>
        }
      </div>

      <div class="contentGrid">
        <mat-card class="surfaceCard">
          <div class="sectionHeader">
            <div>
              <div class="sectionTitle">Actividad reciente</div>
              <div class="sectionSubtitle">Subidas y comparaciones recientes.</div>
            </div>
          </div>
          <div class="activityList">
            @for (item of activity(); track item.title) {
              <div class="activityItem">
                <div class="activityMain">
                  <div class="dot" [class]="'dot ' + item.status"></div>
                  <div class="activityTitle">{{ item.title }}</div>
                  <div class="activitySub">{{ item.subtitle }}</div>
                </div>
                <mat-chip [class]="'statusChip ' + item.status">{{ labelStatus(item.status) }}</mat-chip>
              </div>
            }
          </div>
        </mat-card>

        <mat-card class="surfaceCard">
          <div class="sectionHeader">
            <div>
              <div class="sectionTitle">Acciones rápidas</div>
              <div class="sectionSubtitle">Atajos para las tareas frecuentes.</div>
            </div>
          </div>
          <div class="quickActions">
            <a mat-stroked-button color="primary" routerLink="/invoices/upload">
              <mat-icon>cloud_upload</mat-icon>
              Subir facturas
            </a>
            <a mat-stroked-button color="primary" routerLink="/comparisons/new">
              <mat-icon>compare_arrows</mat-icon>
              Crear comparación
            </a>
            <a mat-stroked-button color="primary" routerLink="/normalization">
              <mat-icon>tune</mat-icon>
              Ir a normalización
            </a>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { display: grid; gap: var(--space-5); padding-bottom: var(--space-6); }
    .kpiGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: var(--space-3); }
    .kpiCard {
      display: grid;
      gap: 8px;
      position: relative;
      overflow: hidden;
      isolation: isolate;
    }
    .kpiCard::before {
      content: '';
      position: absolute;
      inset: 0 auto auto 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, var(--color-primary-500), #5e8fcb);
      z-index: -1;
    }
    .kpiTop { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
    .kpiLabel {
      font-size: var(--font-size-11);
      color: var(--color-muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: var(--font-weight-bold);
    }
    .kpiIcon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      color: var(--color-primary-600);
      background: rgba(47, 94, 159, 0.12);
    }
    .kpiIcon mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .kpiValue { font-size: clamp(26px, 2.8vw, 34px); font-weight: var(--font-weight-bold); letter-spacing: -0.01em; }
    .kpiSub { font-size: var(--font-size-12); color: var(--color-muted); }
    .contentGrid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr); gap: var(--space-4); }
    .sectionHeader { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
    .activityList { display: grid; gap: var(--space-2); }
    .activityItem {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(188, 202, 224, 0.75);
      background: linear-gradient(180deg, #ffffff, #fafdff);
    }
    .activityMain {
      display: grid;
      grid-template-columns: 10px 1fr;
      gap: 2px 10px;
      align-items: center;
      flex: 1;
    }
    .dot { width: 8px; height: 8px; border-radius: 999px; margin-top: 2px; grid-row: 1 / span 2; }
    .dot.ok { background: var(--color-success-500); }
    .dot.pending { background: var(--color-info-500); }
    .dot.error { background: var(--color-danger-500); }
    .activityTitle { font-weight: var(--font-weight-medium); }
    .activitySub { font-size: var(--font-size-12); color: var(--color-muted); }
    .quickActions { display: grid; gap: 10px; }
    .quickActions a { justify-content: flex-start; }
    .statusChip { font-weight: var(--font-weight-medium); text-transform: uppercase; }
    .statusChip.ok { background: rgba(19, 121, 91, 0.14); color: var(--color-success-500); }
    .statusChip.pending { background: rgba(39, 94, 142, 0.14); color: var(--color-info-500); }
    .statusChip.error { background: rgba(183, 59, 59, 0.14); color: var(--color-danger-500); }

    @media (max-width: 900px) {
      .contentGrid { grid-template-columns: 1fr; }
      .kpiGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 640px) {
      .kpiGrid { grid-template-columns: 1fr; }
      .activityItem {
        flex-direction: column;
        align-items: flex-start;
      }
      .activityMain {
        width: 100%;
      }
      .quickActions a {
        width: 100%;
      }
    }
  `],
})
export class DashboardPageComponent {
  readonly kpis = signal([
    { label: 'Facturas 30 días', value: '128', sub: '+12% vs mes anterior', icon: 'receipt_long' },
    { label: 'Gasto total', value: '24.820 €', sub: 'Promedio 806 €/día', icon: 'payments' },
    { label: 'Proveedores', value: '18', sub: '3 nuevos este mes', icon: 'storefront' },
    { label: 'Comparaciones', value: '6', sub: '2 pendientes', icon: 'compare_arrows' },
  ]);

  readonly activity = signal<ActivityItem[]>([
    { title: 'Factura 678207', subtitle: 'Salamar · hace 2h', status: 'ok' },
    { title: 'Comparación Aceites Q4', subtitle: 'Procesando…', status: 'pending' },
    { title: 'Factura 112309', subtitle: 'Error OCR · hace 1d', status: 'error' },
  ]);

  labelStatus(status: ActivityItem['status']) {
    const map: Record<ActivityItem['status'], string> = {
      ok: 'OK',
      pending: 'Pendiente',
      error: 'Error',
    };
    return map[status];
  }
}
