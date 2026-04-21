import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DEFAULT_STATE } from '../data/default-menu';
import { DayMenu, MenuState, Weekday } from '../models/menu.models';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'menu-diario-state-v1';
const MENU_API_BASE = `${environment.apiBaseUrl}/menus/days`;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

@Injectable({ providedIn: 'root' })
export class MenuStoreService {
  private readonly auth = inject(AuthService);
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

    const mergedDays = Object.fromEntries(
      (Object.keys(DEFAULT_STATE.days) as Weekday[]).map((weekday) => [
        weekday,
        { ...structuredClone(DEFAULT_STATE.days[weekday]), ...(fromStorage.days?.[weekday] ?? {}) },
      ])
    ) as MenuState['days'];

    return {
      version: 1,
      days: mergedDays,
      settings: { ...structuredClone(DEFAULT_STATE.settings), ...fromStorage.settings },
    };
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
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    return String(value)
      .split(/[;,]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  private mapApiSettings(records: Array<Record<string, unknown>>, fallback: MenuState['settings']): MenuState['settings'] {
    const normalizeLines = (value: unknown): string[] | null => {
      if (value === null || value === undefined) return null;
      if (Array.isArray(value)) {
        const lines = value.map((v) => String(v).trim()).filter(Boolean);
        return lines.length ? lines : null;
      }
      const lines = this.splitList(value);
      return lines.length ? lines : null;
    };

    for (const record of records) {
      const lines = normalizeLines(record['menu_settings']);
      if (lines && lines.length) return { ...fallback, footerLines: lines };
    }

    return fallback;
  }

  private mapApiDay(weekday: Weekday, raw: Record<string, unknown>, fallback: DayMenu): DayMenu {
    const readString = (keys: string[], defaultValue: string) => {
      for (const key of keys) {
        const value = raw[key];
        if (value !== undefined && value !== null) return String(value).trim();
      }
      return defaultValue;
    };
    const readNumber = (keys: string[], defaultValue: number | null) => {
      for (const key of keys) {
        const value = raw[key];
        if (value !== undefined && value !== null && value !== '') return this.parseNumber(value);
      }
      return defaultValue;
    };
    const readList = (keys: string[], defaultValue: string[]) => {
      for (const key of keys) {
        const value = raw[key];
        if (value !== undefined && value !== null) return this.splitList(value);
      }
      return defaultValue;
    };
    const readBoolean = (keys: string[], defaultValue: boolean) => {
      for (const key of keys) {
        const value = raw[key];
        if (value === undefined || value === null || value === '') continue;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        const normalized = String(value).trim().toLowerCase();
        if (['1', 'true', 'si', 'sí', 'yes'].includes(normalized)) return true;
        if (['0', 'false', 'no'].includes(normalized)) return false;
      }
      return defaultValue;
    };

    return {
      weekday,
      isHoliday: readBoolean(['isHoliday', 'is_holiday', 'holiday'], fallback.isHoliday ?? false),
      platoDelDia: readString(['platoDelDia', 'plato_del_dia', 'plato'], fallback.platoDelDia),
      precioPlatoDelDia: readNumber(['precioPlatoDelDia', 'precio_plato_del_dia'], fallback.precioPlatoDelDia),
      precioMenu: readNumber(['precioMenu', 'precio_menu'], fallback.precioMenu),
      primeros: readList(['primeros'], fallback.primeros),
      segundos: readList(['segundos'], fallback.segundos),
      postres: readList(['postres'], fallback.postres),
      telefono: readString(['telefono', 'teléfono'], fallback.telefono),
      notas: readString(['notas', 'nota'], fallback.notas ?? ''),
    };
  }

  private apiDaySlug(weekday: Weekday): string {
    const map: Record<Weekday, string> = {
      Lunes: 'Lunes',
      Martes: 'Martes',
      Miércoles: 'Miercoles',
      Jueves: 'Jueves',
      Viernes: 'Viernes',
    };
    return map[weekday];
  }

  async loadFromApi(weekday: Weekday) {
    try {
      const token = this.auth.token();
      if (!token) throw new Error('No hay token de autenticación.');

      const slug = this.apiDaySlug(weekday);
      const res = await fetch(`${MENU_API_BASE}/${slug}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`Error leyendo ${weekday}: ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      const raw = (data['day'] as Record<string, unknown>) ?? (data['menu'] as Record<string, unknown>) ?? data;

      const current = this.stateSig();
      const existing = current.days[weekday];
      const nextDay = { ...existing, ...this.mapApiDay(weekday, raw, existing), weekday };
      const nextSettings = this.mapApiSettings([data, raw], current.settings);
      this.stateSig.set({
        ...current,
        days: { ...current.days, [weekday]: nextDay },
        settings: nextSettings,
      });
    } catch (err) {
      console.error('No se pudo cargar el menú desde la API.', err);
    }
  }
}
