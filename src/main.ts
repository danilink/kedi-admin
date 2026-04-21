import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { APP_ROUTES } from './app/app.routes';

registerLocaleData(localeEs);

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    provideRouter(APP_ROUTES),
    { provide: LOCALE_ID, useValue: 'es-ES' },
  ],
}).catch((err) => console.error(err));
