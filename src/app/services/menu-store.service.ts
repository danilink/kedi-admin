import { Injectable, computed, effect, signal } from '@angular/core';
import { DEFAULT_STATE } from '../data/default-menu';
import { DayMenu, MenuState, Weekday } from '../models/menu.models';

const STORAGE_KEY = 'menu-diario-state-v1';

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
}
