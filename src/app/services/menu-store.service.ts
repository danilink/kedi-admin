import { Injectable, computed, effect, signal } from '@angular/core';
import { DEFAULT_STATE } from '../data/default-menu';
import { DayMenu, MenuState, Weekday } from '../models/menu.models';

const STORAGE_KEY = 'menu-diario-state-v1';
const ENDPOINT =
  'https://script.google.com/macros/s/AKfycbxlVInI-VLC7K1fSLRCmGyipK1nBzxlH4lZLNDlO4CIQ2bihVIPJRrxsF4MF1dYZeSv/exec';

const WEEKDAY_MAP: Record<string, Weekday> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  miércoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class MenuStoreService {
  private readonly stateSig = signal<MenuState>(this.loadInitial());

  readonly state = computed(() => this.stateSig());
  readonly settings = computed(() => this.stateSig().settings);

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stateSig()));
    });
  }

  getDay(weekday: Weekday) {
    return computed(() => this.stateSig().days[weekday]);
  }

  updateDay(weekday: Weekday, patch: Partial<DayMenu>) {
    const s = this.stateSig();
    this.stateSig.set({
      ...s,
      days: { ...s.days, [weekday]: { ...s.days[weekday], ...patch, weekday } },
    });
  }

  updateFooterLines(lines: string[]) {
    const s = this.stateSig();
    this.stateSig.set({ ...s, settings: { ...s.settings, footerLines: [...lines] } });
  }

  resetAllToDefaults() {
    this.stateSig.set(structuredClone(DEFAULT_STATE));
  }

  resetDayToDefaults(weekday: Weekday) {
    const s = this.stateSig();
    this.stateSig.set({ ...s, days: { ...s.days, [weekday]: structuredClone(DEFAULT_STATE.days[weekday]) } });
  }

  private loadInitial(): MenuState {
    const fromStorage = safeParse<MenuState>(localStorage.getItem(STORAGE_KEY));
    if (!fromStorage || fromStorage.version !== 1) return structuredClone(DEFAULT_STATE);

    return {
      version: 1,
      days: { ...structuredClone(DEFAULT_STATE.days), ...fromStorage.days },
      settings: { ...structuredClone(DEFAULT_STATE.settings), ...fromStorage.settings },
    };
  }

  private normalizeWeekday(value: string): Weekday | null {
    const key = value.trim().toLowerCase();
    return WEEKDAY_MAP[key] ?? null;
  }

  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const raw = String(value).trim().replace(',', '.');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private splitList(value: unknown): string[] {
    if (!value) return [];
    return String(value)
      .split(';')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  private buildStateFromRows(rows: Array<Record<string, unknown>>): MenuState | null {
    if (!rows.length) return null;

    const base = structuredClone(DEFAULT_STATE);
    const next: MenuState = {
      version: 1,
      days: { ...base.days },
      settings: { ...base.settings },
    };

    for (const row of rows) {
      const weekdayRaw = row['Día'] ?? row['Dia'];
      if (!weekdayRaw) continue;
      const weekday = this.normalizeWeekday(String(weekdayRaw));
      if (!weekday) continue;

      const current = next.days[weekday];
      next.days[weekday] = {
        ...current,
        weekday,
        platoDelDia: String(row['Plato del día'] ?? row['Plato del dia'] ?? current.platoDelDia ?? '').trim(),
        precioPlatoDelDia: this.parseNumber(row['Precio plato del día (€)'] ?? row['Precio plato del dia (€)']),
        precioMenu: this.parseNumber(row['Precio menú (€)'] ?? row['Precio menu (€)']),
        primeros: this.splitList(row['Primeros (lista)']),
        segundos: this.splitList(row['Segundos (lista)']),
        postres: this.splitList(row['Postres caseros (lista)']),
        telefono: String(row['Teléfono / reservas'] ?? row['Telefono / reservas'] ?? current.telefono ?? '').trim(),
        notas: String(row['Notas'] ?? current.notas ?? '').trim(),
      };
    }

    return next;
  }

  async loadFromSheets() {
    try {
      const url = new URL(ENDPOINT);
      url.searchParams.set('action', 'menu-read');
      const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
      if (!res.ok) throw new Error(`Error leyendo menu: ${res.status}`);
      const data = (await res.json()) as {
        ok?: boolean;
        rows?: Array<Record<string, unknown>>;
        menu?: MenuState;
        error?: string;
      };
      if (data.ok === false) throw new Error(data.error || 'Error leyendo menu');

      const next = data.menu ?? (data.rows ? this.buildStateFromRows(data.rows) : null);
      if (next) this.stateSig.set(next);
    } catch (err) {
      console.error('No se pudo cargar el menú desde Google Sheets.', err);
    }
  }
}
