import { Routes } from '@angular/router';
import { EditorPageComponent } from './pages/editor/editor.page';
import { PrintPageComponent } from './pages/print/print.page';
import { LoginPageComponent } from './pages/login/login.page';
import { InvoicesListComponent } from './pages/invoices/invoices-list.page';
import { InvoiceCompareWizardComponent } from './pages/invoices/invoice-compare.page';
import { InvoiceCompareResultPageComponent } from './pages/invoices/invoice-compare-result.page';
import { DashboardPageComponent } from './features/dashboard/dashboard.page';
import { InvoiceUploadPageComponent } from './features/invoices/upload/invoice-upload.page';
import { InvoiceDetailPageComponent } from './features/invoices/detail/invoice-detail.page';
import { NormalizationPageComponent } from './features/normalization/normalization.page';
import { ComparisonsListPageComponent } from './features/comparisons/list/comparisons-list.page';
import { ComparisonsNewPageComponent } from './features/comparisons/new/comparisons-new.page';
import { ComparisonsDetailPageComponent } from './features/comparisons/detail/comparisons-detail.page';
import { PriceListProductsPageComponent } from './features/price-list-products/price-list-products.page';
import { DishesPageComponent } from './features/dishes/dishes.page';
import { authGuard } from './auth.guard';

export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginPageComponent },
  { path: 'dashboard', component: DashboardPageComponent, canActivate: [authGuard] },
  { path: 'editor', component: EditorPageComponent, canActivate: [authGuard] },
  { path: 'print', component: PrintPageComponent, canActivate: [authGuard] },
  { path: 'invoices/upload', component: InvoiceUploadPageComponent, canActivate: [authGuard] },
  { path: 'invoices', component: InvoicesListComponent, canActivate: [authGuard] },
  { path: 'invoices/:id', component: InvoiceDetailPageComponent, canActivate: [authGuard] },
  { path: 'normalization', component: NormalizationPageComponent, canActivate: [authGuard] },
  { path: 'comparisons', component: ComparisonsListPageComponent, canActivate: [authGuard] },
  { path: 'comparisons/new', component: ComparisonsNewPageComponent, canActivate: [authGuard] },
  { path: 'comparisons/:id', component: ComparisonsDetailPageComponent, canActivate: [authGuard] },
  { path: 'price-list-products', component: PriceListProductsPageComponent, canActivate: [authGuard] },
  { path: 'dishes', component: DishesPageComponent, canActivate: [authGuard] },
  { path: 'invoice-compare', component: InvoiceCompareWizardComponent, canActivate: [authGuard] },
  { path: 'invoice-compare/result', component: InvoiceCompareResultPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' },
];
