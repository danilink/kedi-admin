import { Injectable, NgZone, computed, effect, inject, signal } from '@angular/core';
import { GOOGLE_CLIENT_ID } from '../data/google-auth';
import { ALLOWED_EMAILS } from '../data/allowed-emails';

type AuthUser = {
  email: string;
  name: string;
  picture?: string;
  token?: string;
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
  private googleInitialized = false;
  private refreshTimer: number | null = null;

  readonly user = computed(() => this.userSig());
  readonly isLoggedIn = computed(() => !!this.userSig()?.token);
  readonly token = computed(() => this.userSig()?.token ?? null);

  constructor() {
    effect(() => {
      const user = this.userSig();
      if (!user) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    });

    effect(() => {
      const token = this.userSig()?.token ?? null;
      if (!token) {
        this.clearRefreshTimer();
        return;
      }
      void this.scheduleTokenRefresh(token);
    });
  }

  async initGoogle(buttonEl: HTMLElement, onError: (msg: string) => void) {
    const ready = await this.ensureGoogleInitialized(onError);
    if (!ready) return;
    const google = (window as any).google;
    google.accounts.id.renderButton(buttonEl, { theme: 'outline', size: 'large', width: 280 });
  }

  signOut() {
    this.userSig.set(null);
    this.clearRefreshTimer();
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
        token: resp.credential,
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
    const user = safeParse<AuthUser>(localStorage.getItem(STORAGE_KEY));
    return user?.token ? user : null;
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

  private async ensureGoogleInitialized(onError?: (msg: string) => void) {
    if (this.googleInitialized) return true;
    try {
      await this.waitForGoogle();
    } catch {
      onError?.('No se pudo cargar Google Identity.');
      return false;
    }
    const google = (window as any).google;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp: GoogleCredentialResponse) => this.zone.run(() => this.handleCredential(resp, onError ?? (() => {}))),
    });
    this.googleInitialized = true;
    return true;
  }

  private getTokenExpiryMs(token: string) {
    try {
      const payload = parseJwt(token);
      const exp = Number(payload?.exp);
      return Number.isFinite(exp) ? exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string, leewayMs = 60000) {
    const expMs = this.getTokenExpiryMs(token);
    if (!expMs) return false;
    return Date.now() + leewayMs >= expMs;
  }

  private async scheduleTokenRefresh(token: string) {
    this.clearRefreshTimer();
    const expMs = this.getTokenExpiryMs(token);
    if (!expMs) return;
    const delay = Math.max(0, expMs - Date.now() - 60000);
    if (delay === 0 && this.isTokenExpired(token)) {
      await this.refreshToken();
      return;
    }
    this.refreshTimer = window.setTimeout(() => {
      void this.refreshToken();
    }, delay);
  }

  private async refreshToken() {
    const currentToken = this.userSig()?.token;
    if (!currentToken || !this.isTokenExpired(currentToken)) return;
    const ready = await this.ensureGoogleInitialized();
    if (!ready) return;
    const google = (window as any).google;
    google?.accounts?.id?.prompt?.();
  }

  private clearRefreshTimer() {
    if (this.refreshTimer) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
  }
}
