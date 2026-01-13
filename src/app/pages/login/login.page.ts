import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="wrap">
      <mat-card>
        <mat-card-title>Acceso al editor</mat-card-title>
        <mat-card-subtitle>Solo cuentas autorizadas.</mat-card-subtitle>

        <div class="buttonWrap" #button></div>
        @if (error()) { <div class="error">{{ error() }}</div> }
      </mat-card>
    </div>
  `,
  styles: [`
    .wrap { display: grid; place-items: center; min-height: calc(100vh - 64px); padding: 16px; }
    mat-card { padding: 24px; width: min(420px, 92vw); text-align: center; }
    .buttonWrap { display: flex; justify-content: center; margin-top: 16px; }
    .error { margin-top: 12px; color: #c62828; font-weight: 600; }
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
