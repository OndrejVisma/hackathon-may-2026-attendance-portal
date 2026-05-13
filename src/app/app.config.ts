import { ApplicationConfig, ErrorHandler, provideAppInitializer, inject, provideZoneChangeDetection, isDevMode } from '@angular/core';
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
import { circuitBreakerInterceptor } from '../shared/http/interceptors/circuit-breaker.interceptor';
import { API_CONFIG, DEFAULT_API_CONFIG } from '../shared/http/api-config';
import { provideServiceWorker } from '@angular/service-worker';
import { OIDC_CONFIG, DEFAULT_OIDC_CONFIG } from '../features/auth/infrastructure/oidc-config';
import { OidcAuthService } from '../features/auth/infrastructure/oidc-auth.service';
import { SessionGuard } from '../features/auth/domain/session-guard.service';
import { TELEMETRY_CONFIG, DEFAULT_TELEMETRY_CONFIG } from '../shared/telemetry/telemetry-config';
import { TelemetryService, TelemetryErrorHandler } from '../shared/telemetry/telemetry.service';
import { FeatureFlagsService } from '../shared/feature-flags/feature-flags.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimations(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,
        etagInterceptor,
        circuitBreakerInterceptor,  // open-circuit short-circuits before retry
        errorEnvelopeInterceptor,
        conflictInterceptor,        // 409/412 toast + cache invalidation
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
            retry: false,
          },
        },
      }),
    ),
    { provide: API_CONFIG,       useValue: DEFAULT_API_CONFIG },
    { provide: OIDC_CONFIG,      useValue: DEFAULT_OIDC_CONFIG },
    { provide: TELEMETRY_CONFIG, useValue: DEFAULT_TELEMETRY_CONFIG },
    { provide: ErrorHandler, useClass: TelemetryErrorHandler },
    provideOAuthClient(),
    provideAppInitializer(async () => {
      inject(TelemetryService).start();
      await inject(OidcAuthService).configure();
      inject(SessionGuard).start();
      void inject(FeatureFlagsService).refresh();
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
