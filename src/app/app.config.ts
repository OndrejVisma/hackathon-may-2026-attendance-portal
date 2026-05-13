import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideQueryClient, QueryClient } from '@tanstack/angular-query-experimental';

import { routes } from './app.routes';
import { timeoutInterceptor } from '../shared/http/interceptors/timeout.interceptor';
import { retryInterceptor } from '../shared/http/interceptors/retry.interceptor';
import { errorEnvelopeInterceptor } from '../shared/http/interceptors/error-envelope.interceptor';
import { authInterceptor } from '../shared/http/interceptors/auth.interceptor';
import { API_CONFIG, DEFAULT_API_CONFIG } from '../shared/http/api-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimations(),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorEnvelopeInterceptor, retryInterceptor, timeoutInterceptor]),
    ),
    provideQueryClient(
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: false, // retry handled by interceptor
          },
        },
      }),
    ),
    { provide: API_CONFIG, useValue: DEFAULT_API_CONFIG },
  ],
};
