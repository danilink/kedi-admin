import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
  ],
  template: `
    @if (isLoginRoute()) {
      <div class="authShell">
        <router-outlet />
      </div>
    } @else {
      <mat-sidenav-container class="shell">
        <mat-sidenav
          class="sidenav"
          [mode]="sidenavMode()"
          [opened]="sidenavOpened()"
          [fixedInViewport]="isMobile()"
          [fixedTopGap]="isMobile() ? 64 : 0"
        >
          <div class="sidenavHeader">
            <div>
              <div class="brandTitle">La Casona</div>
              <div class="brandSub">Gestión de menú</div>
            </div>
            <button mat-icon-button class="collapseBtn" (click)="toggleSidenav()" aria-label="Plegar menú">
              <mat-icon>chevron_left</mat-icon>
            </button>
          </div>
          <mat-nav-list class="navList">
            <a mat-list-item routerLink="/editor" routerLinkActive="mdc-list-item--activated" class="navItem">
              <mat-icon>edit_note</mat-icon>
              <span>Editor</span>
            </a>
            <a mat-list-item routerLink="/print" routerLinkActive="mdc-list-item--activated" class="navItem">
              <mat-icon>print</mat-icon>
              <span>Imprimir</span>
            </a>
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content>
          <mat-toolbar class="app-toolbar">
            <button
              mat-icon-button
              class="menuBtn"
              (click)="toggleSidenav()"
              aria-label="Alternar menú"
              [class.is-hidden]="!isMobile() && sidenavOpened()"
            >
              <mat-icon>menu</mat-icon>
            </button>
            <a class="title" routerLink="/editor" aria-label="Ir al inicio">
              <img class="brandLogo" src="assets/logo.png" alt="La Casona" />
            </a>
            <span class="spacer"></span>
            @if (isLoggedIn()) {
              <div class="userBadge">
                <mat-icon>account_circle</mat-icon>
                <span class="user">{{ userEmail() }}</span>
              </div>
              <button mat-stroked-button color="primary" (click)="logout()">
                <mat-icon>logout</mat-icon>
                Salir
              </button>
            }
          </mat-toolbar>

          <main class="mainContent">
            <router-outlet />
          </main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    }
  `,
  styles: [`
    .spacer { flex: 1 1 auto; }
    .user { font-size: 12px; opacity: 0.75; }
    .title { text-decoration: none; color: inherit; font-weight: 700; margin-left: 8px; display: inline-flex; align-items: center; }
    .menuBtn.is-hidden { display: none; }
    .collapseBtn { margin-left: auto; }
    .collapseBtn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .brandLogo { height: 28px; display: block; }
    .authShell { min-height: 100vh; display: block; }
    .userBadge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      margin-right: 12px;
      border-radius: 999px;
      background: rgba(107, 75, 50, 0.12);
      color: var(--color-primary-700);
      font-weight: 600;
      max-width: 220px;
    }
    .userBadge mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .userBadge .user {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .userBadge { display: none; }
      .title { font-size: 14px; }
      .brandLogo { height: 24px; }
    }
  `],
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  readonly userEmail = computed(() => this.auth.user()?.email ?? '');
  readonly sidenavOpen = signal(true);
  readonly isMobile = signal(false);
  readonly isLoginRoute = signal(false);
  readonly sidenavMode = computed(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidenavOpened = computed(() => this.sidenavOpen());

  constructor() {
    this.isLoginRoute.set(this.router.url.startsWith('/login'));
    this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        const wasMobile = this.isMobile();
        this.isMobile.set(state.matches);
        if (state.matches) {
          this.sidenavOpen.set(false);
        } else if (wasMobile) {
          this.sidenavOpen.set(true);
        }
      });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isLoginRoute.set(this.router.url.startsWith('/login'));
      });
  }

  logout() {
    this.auth.signOut();
    this.router.navigateByUrl('/login');
  }

  toggleSidenav() {
    this.sidenavOpen.set(!this.sidenavOpen());
  }
}
