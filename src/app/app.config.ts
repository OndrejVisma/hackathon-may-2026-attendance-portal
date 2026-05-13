import { ApplicationConfig, provideAppInitializer, inject, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideQueryClient, QueryClient } from '@tanstack/angular-query-experimental';
import { provideOAuthClient } from 'angular-oauth2-oidc';

import { routes } from './app.routes';
import { timeoutInterceptor } from '../shared/http/interceptors/timeout.interceptor';
import { retryInterceptor } from '../shared/http/interceptors/retry.interceptor';
import { errorEnvelopeInterceptor } from '../shared/http/interceptors/error-envelope.interceptor';
import { authInterceptor } from '../shared/http/interceptors/auth.interceptor';
import { etagInterceptor, conflictInterceptor } from '../shared/http/interceptors/etag.interceptor';
import { API_CONFIG, DEFAULT_API_CONFIG } from '../shared/http/api-config';
import { provideServiceWorker } from '@angular/service-worker';
import { OIDC_CONFIG, DEFAULT_OIDC_CONFIG } from '../features/auth/infrastructure/oidc-config';
import { OidcAuthService } from '../features/auth/infrastructure/oidc-auth.service';
import { SessionGuard } from '../features/auth/domain/session-guard.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimations(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,
        etagInterceptor,        // outbound If-Match + inbound ETag capture
        errorEnvelopeInterceptor,
        conflictInterceptor,    // 409/412 toast + cache invalidation
        retryInterceptor,
        timeoutInterceptor,
      ]),
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
    { provide: OIDC_CONFIG, useValue: DEFAULT_OIDC_CONFIG },
    provideOAuthClient(),
    // Bootstrap OIDC discovery + start the session guard once Angular boots.
    provideAppInitializer(async () => {
      await inject(OidcAuthService).configure();
      inject(SessionGuard).start();
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
