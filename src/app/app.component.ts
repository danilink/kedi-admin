import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet, IsActiveMatchOptions } from '@angular/router';
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
          [fixedTopGap]="isMobile() ? 68 : 0"
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
            <a
              mat-list-item
              routerLink="/dashboard"
              class="navItem"
              [class.navActive]="isActive('/dashboard', true)"
            >
              <mat-icon>space_dashboard</mat-icon>
              <span>Dashboard</span>
            </a>

            <div class="navGroup" [class.is-open]="invoicesOpen()">
              <button
                type="button"
                class="navGroupTitle"
                [class.is-active]="invoicesOpen()"
                (click)="toggleInvoicesMenu()"
                [attr.aria-expanded]="invoicesOpen()"
              >
                <mat-icon>receipt_long</mat-icon>
                <span>Facturas</span>
                <mat-icon class="chevron" [class.is-open]="invoicesOpen()">expand_more</mat-icon>
              </button>
              @if (invoicesOpen()) {
                <div class="navSubList">
                  <a
                    mat-list-item
                    routerLink="/invoices"
                    class="navItem navSubItem"
                    [class.navActive]="isActive('/invoices')"
                  >
                    <mat-icon>list_alt</mat-icon>
                    <span>Listado</span>
                  </a>
                  <a
                    mat-list-item
                    routerLink="/invoices/upload"
                    class="navItem navSubItem"
                    [class.navActive]="isActive('/invoices/upload', true)"
                  >
                    <mat-icon>cloud_upload</mat-icon>
                    <span>Importar</span>
                  </a>
                  <a
                    mat-list-item
                    routerLink="/normalization"
                    class="navItem navSubItem"
                    [class.navActive]="isActive('/normalization')"
                  >
                    <mat-icon>tune</mat-icon>
                    <span>Normalización</span>
                  </a>
                  <a
                    mat-list-item
                    routerLink="/comparisons"
                    class="navItem navSubItem"
                    [class.navActive]="isActive('/comparisons')"
                  >
                    <mat-icon>compare_arrows</mat-icon>
                    <span>Comparaciones</span>
                  </a>
                </div>
              }
            </div>

            <div class="navGroup" [class.is-open]="dailyMenuOpen()">
              <button
                type="button"
                class="navGroupTitle"
                [class.is-active]="dailyMenuOpen()"
                (click)="toggleDailyMenu()"
                [attr.aria-expanded]="dailyMenuOpen()"
              >
                <mat-icon>edit_note</mat-icon>
                <span>Platos</span>
                <mat-icon class="chevron" [class.is-open]="dailyMenuOpen()">expand_more</mat-icon>
              </button>
              @if (dailyMenuOpen()) {
                <div class="navSubList">
                  <a
                    mat-list-item
                    routerLink="/editor"
                    class="navItem navSubItem"
                    [class.navActive]="isActive('/editor')"
                  >
                    <mat-icon>today</mat-icon>
                    <span>Menú diario</span>
                  </a>
                  <a
                    mat-list-item
                    routerLink="/dishes"
                    class="navItem navSubItem"
                    [class.navActive]="isActive('/dishes')"
                  >
                    <mat-icon>restaurant</mat-icon>
                    <span>Listado de platos</span>
                  </a>
                </div>
              }
            </div>
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
            <a class="title" routerLink="/dashboard" aria-label="Ir al inicio">
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
                <span class="logoutText">Salir</span>
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
    .user { font-size: 12px; opacity: 0.78; }
    .title { text-decoration: none; color: inherit; font-weight: 700; margin-left: 10px; display: inline-flex; align-items: center; }
    .menuBtn.is-hidden { display: none; }
    .collapseBtn {
      margin-left: auto;
      color: var(--color-primary-600);
      transition: background-color 140ms ease;
    }
    .collapseBtn:hover { background: rgba(47, 94, 159, 0.08); }
    .collapseBtn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .brandLogo { height: 54px; width: auto; display: block; }
    .authShell { min-height: 100vh; display: block; }
    .userBadge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      margin-right: 12px;
      border-radius: 999px;
      background: rgba(47, 94, 159, 0.12);
      color: var(--color-primary-700);
      font-weight: 600;
      max-width: 220px;
      border: 1px solid rgba(47, 94, 159, 0.2);
    }
    .userBadge mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .userBadge .user {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .navGroup { margin: 8px 0 4px; }
    .navGroupTitle {
      width: 100%;
      border: 0;
      background: transparent;
      cursor: pointer;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-muted);
      font-weight: 600;
      border-radius: 10px;
      transition: background-color 140ms ease, color 140ms ease;
    }
    .navGroupTitle:hover { background: rgba(47, 94, 159, 0.06); color: var(--color-primary-600); }
    .navGroupTitle .chevron { margin-left: auto; transition: transform 160ms ease; }
    .navGroupTitle .chevron.is-open { transform: rotate(180deg); }
    .navGroupTitle.is-active { color: var(--color-text); background: rgba(47, 94, 159, 0.1); border-radius: 10px; }
    .navItem.navActive {
      background: transparent;
      color: inherit;
    }
    .navItem.navActive mat-icon,
    .navItem.navActive .mat-icon,
    .navItem.navActive mat-icon svg { color: var(--color-primary-600); fill: var(--color-primary-600); }
    .navSubList { display: grid; gap: 4px; padding: 0 8px 4px; }
    .navSubItem { padding-left: 12px; }
    .navBadge {
      margin-left: auto;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(47, 129, 237, 0.15);
      color: #2f6ad1;
    }
    .navBadge.warning { background: rgba(179, 38, 30, 0.12); color: var(--color-danger-500); }

    @media (max-width: 768px) {
      .userBadge { display: none; }
      .title { font-size: 14px; }
      .brandLogo { height: 50px; }
    }

    @media (max-width: 480px) {
      .title { margin-left: 4px; }
      .brandLogo { height: 44px; }
      .menuBtn { margin-left: -4px; }
      .logoutText { display: none; }
      .mat-toolbar .mat-mdc-stroked-button {
        min-width: 0;
        width: 40px;
        padding: 0;
      }
      .mat-toolbar .mat-mdc-stroked-button .mat-icon { margin-right: 0; }
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
  readonly invoicesOpen = signal(false);
  readonly dailyMenuOpen = signal(false);
  readonly sidenavMode = computed(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidenavOpened = computed(() => this.sidenavOpen());

  constructor() {
    this.isLoginRoute.set(this.router.url.startsWith('/login'));
    this.invoicesOpen.set(this.isInvoicesRoute(this.router.url));
    this.dailyMenuOpen.set(this.isDailyMenuRoute(this.router.url));
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
        const url = this.router.url;
        this.isLoginRoute.set(url.startsWith('/login'));
        this.invoicesOpen.set(this.isInvoicesRoute(url));
        this.dailyMenuOpen.set(this.isDailyMenuRoute(url));
      });
  }

  logout() {
    this.auth.signOut();
    this.router.navigateByUrl('/login');
  }

  toggleSidenav() {
    this.sidenavOpen.set(!this.sidenavOpen());
  }

  toggleInvoicesMenu() {
    this.invoicesOpen.set(!this.invoicesOpen());
  }

  toggleDailyMenu() {
    this.dailyMenuOpen.set(!this.dailyMenuOpen());
  }

  isActive(url: string, exact = false) {
    const options: IsActiveMatchOptions = exact
      ? { paths: 'exact', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }
      : { paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' };
    return this.router.isActive(url, options);
  }

  private isInvoicesRoute(url: string) {
    return (
      url.startsWith('/invoices')
      || url.startsWith('/normalization')
      || url.startsWith('/comparisons')
      || url.startsWith('/price-list-products')
    );
  }

  private isDailyMenuRoute(url: string) {
    return url.startsWith('/editor') || url.startsWith('/dishes');
  }

}
