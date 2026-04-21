import { Routes } from '@angular/router';
import { EditorPageComponent } from './pages/editor/editor.page';
import { PrintPageComponent } from './pages/print/print.page';
import { LoginPageComponent } from './pages/login/login.page';
import { authGuard } from './auth.guard';

export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'editor' },
  { path: 'login', component: LoginPageComponent },
  { path: 'editor', component: EditorPageComponent, canActivate: [authGuard] },
  { path: 'print', component: PrintPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'editor' },
];
