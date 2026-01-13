import { Injectable, computed, effect, signal } from '@angular/core';
import { MenuState } from '../models/menu.models';
import { EMPTY_LIBRARY, MenuLibrary } from '../data/menu-library';

const STORAGE_KEY = 'menu-diario-library-v1';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function mergeUnique(existing: string[], incoming: string[]) {
  const map = new Map<string, string>();
  for (const v of existing) {
    const n = normalize(v);
    if (n) map.set(n, v.trim());
  }
  for (const v of incoming) {
    const t = v.trim();
    const n = normalize(t);
    if (n && !map.has(n)) map.set(n, t);
  }
  return Array.from(map.values());
}

@Injectable({ providedIn: 'root' })
export class MenuLibraryService {
  private readonly stateSig = signal<MenuLibrary>(this.loadInitial());
  private bootstrapped = false;

  readonly state = computed(() => this.stateSig());
  readonly primeros = computed(() => this.stateSig().primeros);
  readonly segundos = computed(() => this.stateSig().segundos);
  readonly postres = computed(() => this.stateSig().postres);

  constructor() {
    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stateSig()));
    });
  }

  bootstrapFromState(state: MenuState) {
    if (this.bootstrapped) return;
    this.bootstrapped = true;
    const days = Object.values(state.days ?? {});
    this.addItems('primeros', days.flatMap((d) => d.primeros ?? []));
    this.addItems('segundos', days.flatMap((d) => d.segundos ?? []));
    this.addItems('postres', days.flatMap((d) => d.postres ?? []));
  }

  addItems(kind: 'primeros' | 'segundos' | 'postres', items: string[]) {
    const cleaned = items.map((v) => v.trim()).filter(Boolean);
    if (!cleaned.length) return;
    const current = this.stateSig();
    this.stateSig.set({
      ...current,
      [kind]: mergeUnique(current[kind], cleaned),
    });
  }

  private loadInitial(): MenuLibrary {
    const fromStorage = safeParse<MenuLibrary>(localStorage.getItem(STORAGE_KEY));
    if (!fromStorage || fromStorage.version !== 1) return structuredClone(EMPTY_LIBRARY);
    return {
      version: 1,
      primeros: [...fromStorage.primeros],
      segundos: [...fromStorage.segundos],
      postres: [...fromStorage.postres],
    };
  }
}
