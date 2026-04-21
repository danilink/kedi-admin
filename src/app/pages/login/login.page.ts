import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div class="wrap">
      <mat-card class="loginCard">
        <div class="cardHeader">
          <img class="logo" src="assets/logo.png" alt="KEDI" />
          <div class="appName">KEDI</div>
          <div class="appSubtitle">Gestor de contenidos</div>
          <div class="badgeIcon">
            <mat-icon>lock</mat-icon>
          </div>
          <div>
            <mat-card-title>Acceso al editor</mat-card-title>
            <mat-card-subtitle>Solo cuentas autorizadas.</mat-card-subtitle>
          </div>
        </div>

        <div class="buttonWrap" #button></div>
        @if (error()) {
          <div class="error">
            <mat-icon>error</mat-icon>
            <span>{{ error() }}</span>
          </div>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .wrap { display: grid; place-items: center; min-height: 100vh; padding: 32px 16px; }
    .loginCard { padding: 28px; width: min(440px, 92vw); text-align: left; }
    .cardHeader {
      display: grid;
      gap: 10px;
      margin-bottom: 18px;
      justify-items: center;
      text-align: center;
    }
    .logo { height: 72px; width: auto; }
    .appName {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.6px;
      color: var(--color-primary-700);
      text-transform: uppercase;
    }
    .appSubtitle {
      font-size: 13px;
      color: var(--color-muted);
      letter-spacing: 0.4px;
    }
    .badgeIcon {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      background: rgba(111, 84, 55, 0.12);
      color: #6f5437;
    }
    .buttonWrap { display: flex; justify-content: center; margin-top: 16px; }
    .error {
      margin-top: 12px;
      color: #b42318;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  `],
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('button', { static: true }) button?: ElementRef<HTMLDivElement>;

  readonly error = signal('');
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());

  constructor() {
    effect(() => {
      if (this.isLoggedIn()) this.router.navigateByUrl('/editor');
    });
  }

  ngAfterViewInit() {
    const el = this.button?.nativeElement;
    if (!el) return;
    this.auth.initGoogle(el, (msg) => this.error.set(msg));
  }

  ngOnInit() {}
}
