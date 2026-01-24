import { Routes } from '@angular/router';
import { EditorPageComponent } from './pages/editor/editor.page';
import { PrintPageComponent } from './pages/print/print.page';
import { LoginPageComponent } from './pages/login/login.page';
import { InvoicesListComponent } from './pages/invoices/invoices-list.page';
import { InvoiceDetailComponent } from './pages/invoices/invoice-detail.page';
import { InvoiceCompareWizardComponent } from './pages/invoices/invoice-compare.page';
import { authGuard } from './auth.guard';

export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'editor' },
  { path: 'login', component: LoginPageComponent },
  { path: 'editor', component: EditorPageComponent, canActivate: [authGuard] },
  { path: 'print', component: PrintPageComponent, canActivate: [authGuard] },
  { path: 'invoices', component: InvoicesListComponent, canActivate: [authGuard] },
  { path: 'invoices/:id', component: InvoiceDetailComponent, canActivate: [authGuard] },
  { path: 'invoice-compare', component: InvoiceCompareWizardComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'editor' },
];
