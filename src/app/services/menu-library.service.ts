import { Injectable, computed, inject, signal } from '@angular/core';
import { MenuState } from '../models/menu.models';
import { EMPTY_LIBRARY, MenuLibrary } from '../data/menu-library';
import { AuthService } from './auth.service';

const ENDPOINT = '/api/v1/suggestions';

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

function diffNewItems(existing: string[], incoming: string[]) {
  const known = new Set(existing.map((v) => normalize(v)).filter(Boolean));
  return incoming
    .map((v) => v.trim())
    .map((v) => ({ raw: v, norm: normalize(v) }))
    .filter((v) => v.raw && v.norm && !known.has(v.norm))
    .map((v) => v.raw);
}

@Injectable({ providedIn: 'root' })
export class MenuLibraryService {
  private readonly auth = inject(AuthService);
  private readonly stateSig = signal<MenuLibrary>(structuredClone(EMPTY_LIBRARY));
  private bootstrapped = false;

  readonly state = computed(() => this.stateSig());
  readonly primeros = computed(() => this.stateSig().primeros);
  readonly segundos = computed(() => this.stateSig().segundos);
  readonly postres = computed(() => this.stateSig().postres);

  constructor() {}

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
    const newItems = diffNewItems(current[kind], cleaned);
    this.stateSig.set({
      ...current,
      [kind]: mergeUnique(current[kind], cleaned),
    });
    if (newItems.length) {
      void this.appendToSheet(kind, newItems);
    }
  }

  async loadFromSheets() {
    try {
      const [primeros, segundos, postres] = await Promise.all([
        this.readSheet('primeros'),
        this.readSheet('segundos'),
        this.readSheet('postres'),
      ]);
      this.stateSig.set({
        version: 1,
        primeros,
        segundos,
        postres,
      });
    } catch (err) {
      console.error('No se pudieron cargar las sugerencias.', err);
    }
  }

  private async readSheet(kind: 'primeros' | 'segundos' | 'postres'): Promise<string[]> {
    const token = this.auth.token();
    if (!token) throw new Error('No hay token de autenticación.');

    const url = new URL(ENDPOINT, window.location.origin);
    url.searchParams.set('kind', kind);
    const res = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`Error leyendo ${kind}: ${res.status}`);
    const data = (await res.json()) as { items?: string[] };
    return (data.items ?? []).map((v) => v.trim()).filter(Boolean);
  }

  private async appendToSheet(kind: 'primeros' | 'segundos' | 'postres', items: string[]) {
    try {
      const token = this.auth.token();
      if (!token) throw new Error('No hay token de autenticación.');

      await fetch(`${ENDPOINT}/append`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kind, items }),
      });
    } catch (err) {
      console.error(`Error guardando sugerencias en ${kind}.`, err);
    }
  }
}
