import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
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
    <mat-sidenav-container class="shell">
      <mat-sidenav class="sidenav" mode="side" [opened]="sidenavOpen()">
        <div class="sidenavHeader">Menú</div>
        <mat-nav-list>
          <a mat-list-item routerLink="/editor">Editor</a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar>
          <button mat-icon-button (click)="toggleSidenav()" aria-label="Alternar menú">
            <mat-icon>menu</mat-icon>
          </button>
          <a class="title" routerLink="/editor">La casona</a>
          <span class="spacer"></span>
          @if (isLoggedIn()) {
            <span class="user">{{ userEmail() }}</span>
            <button mat-button (click)="logout()">Salir</button>
          }
        </mat-toolbar>

        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .spacer { flex: 1 1 auto; }
    mat-toolbar { position: sticky; top: 0; z-index: 10; }
    .user { margin-right: 8px; font-size: 12px; opacity: 0.7; }
    .shell { min-height: 100vh; }
    .sidenav { width: 220px; }
    .sidenavHeader { padding: 16px 16px 8px; font-weight: 700; opacity: 0.7; }
    .title { text-decoration: none; color: inherit; font-weight: 700; margin-left: 8px; }
  `],
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  readonly userEmail = computed(() => this.auth.user()?.email ?? '');
  readonly sidenavOpen = signal(true);

  logout() {
    this.auth.signOut();
    this.router.navigateByUrl('/login');
  }

  toggleSidenav() {
    this.sidenavOpen.set(!this.sidenavOpen());
  }
}
