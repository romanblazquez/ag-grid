import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { appRoutes } from './app.routes';
import {
  SECURITY_SERVICE_URL,
  BROKER_SERVICE_URL,
  PERSON_SERVICE_URL,
  PORTFOLIO_SERVICE_URL,
  CODEVALUE_SERVICE_URL,
} from '@trade-platform/shared/ui/common-search';

const MOCK_API = 'http://localhost:3000/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(),
    { provide: SECURITY_SERVICE_URL,  useValue: `${MOCK_API}/securities` },
    { provide: BROKER_SERVICE_URL,    useValue: `${MOCK_API}/brokers` },
    { provide: PERSON_SERVICE_URL,    useValue: `${MOCK_API}/persons` },
    { provide: PORTFOLIO_SERVICE_URL, useValue: `${MOCK_API}/portfolio` },
    { provide: CODEVALUE_SERVICE_URL, useValue: `${MOCK_API}/codevalues` },
    provideAnimationsAsync(),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities',
          },
        },
      },
    }),
  ],
};
