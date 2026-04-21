import { Injectable, NgZone, computed, effect, inject, signal } from '@angular/core';
import { GOOGLE_CLIENT_ID } from '../data/google-auth';
import { ALLOWED_EMAILS } from '../data/allowed-emails';

type AuthUser = {
  email: string;
  name: string;
  picture?: string;
};

type GoogleCredentialResponse = {
  credential: string;
  select_by: string;
};

const STORAGE_KEY = 'menu-diario-auth-v1';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function parseJwt(token: string) {
  const payload = token.split('.')[1];
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decodeURIComponent(Array.from(decoded).map((c) => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join('')));
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly zone = inject(NgZone);
  private readonly userSig = signal<AuthUser | null>(this.loadInitial());

  readonly user = computed(() => this.userSig());
  readonly isLoggedIn = computed(() => !!this.userSig());

  constructor() {
    effect(() => {
      const user = this.userSig();
      if (!user) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    });
  }

  async initGoogle(buttonEl: HTMLElement, onError: (msg: string) => void) {
    try {
      await this.waitForGoogle();
    } catch {
      onError('No se pudo cargar Google Identity.');
      return;
    }

    const google = (window as any).google;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp: GoogleCredentialResponse) => this.zone.run(() => this.handleCredential(resp, onError)),
    });
    google.accounts.id.renderButton(buttonEl, { theme: 'outline', size: 'large', width: 280 });
  }

  signOut() {
    this.userSig.set(null);
    const google = (window as any).google;
    if (google?.accounts?.id?.disableAutoSelect) {
      google.accounts.id.disableAutoSelect();
    }
  }

  private handleCredential(resp: GoogleCredentialResponse, onError: (msg: string) => void) {
    try {
      const payload = parseJwt(resp.credential);
      const email = normalizeEmail(payload.email ?? '');
      if (!email) {
        onError('No se pudo obtener el correo.');
        return;
      }
      if (!this.isAllowed(email)) {
        onError('Tu cuenta no tiene permiso.');
        this.signOut();
        return;
      }
      this.userSig.set({
        email,
        name: payload.name ?? email,
        picture: payload.picture,
      });
    } catch {
      onError('Error al validar la credencial.');
    }
  }

  private isAllowed(email: string) {
    const allowed = ALLOWED_EMAILS.map(normalizeEmail).filter(Boolean);
    return allowed.includes(normalizeEmail(email));
  }

  private loadInitial() {
    return safeParse<AuthUser>(localStorage.getItem(STORAGE_KEY));
  }

  private waitForGoogle() {
    return new Promise<void>((resolve, reject) => {
      let tries = 0;
      const timer = setInterval(() => {
        const google = (window as any).google;
        if (google?.accounts?.id) {
          clearInterval(timer);
          resolve();
          return;
        }
        tries += 1;
        if (tries >= 20) {
          clearInterval(timer);
          reject(new Error('timeout'));
        }
      }, 250);
    });
  }
}
