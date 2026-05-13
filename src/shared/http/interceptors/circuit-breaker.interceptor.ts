import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ToastService } from '../../ui/toast.service';
import { log } from '../../logging/logger';

// Per FE refinement §29 Bonus.
// Per-endpoint-family circuit breaker:
//   CLOSED: requests pass through.
//   OPEN: requests fail immediately with a 503-shaped synthetic error.
//   HALF_OPEN: one probe is allowed; success → CLOSED, failure → OPEN.
// Trip conditions: 5 consecutive 5xx in a 30s window.
// Cooldown: 60s before HALF_OPEN.

type State = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface BreakerEntry {
  state: State;
  consecutiveFailures: number;
  openedAt: number;
  windowStart: number;
}

const FAILURE_THRESHOLD = 5;
const WINDOW_MS = 30_000;
const COOLDOWN_MS = 60_000;

const families = new Map<string, BreakerEntry>();
let bannerShown = false;

// Family = first path segment after the API prefix. /api/v1/absences/abc -> 'absences'.
const familyOf = (url: string): string => {
  try {
    const u = new URL(url, location.origin);
    const parts = u.pathname.split('/').filter(Boolean);
    // Drop common API prefixes.
    while (parts.length > 0 && (parts[0] === 'api' || /^v\d+$/.test(parts[0] ?? ''))) parts.shift();
    return parts[0] ?? '_root';
  } catch {
    return '_unknown';
  }
};

const get = (family: string): BreakerEntry => {
  let e = families.get(family);
  if (!e) {
    e = { state: 'CLOSED', consecutiveFailures: 0, openedAt: 0, windowStart: 0 };
    families.set(family, e);
  }
  return e;
};

const tripIfNeeded = (e: BreakerEntry, now: number): void => {
  if (now - e.windowStart > WINDOW_MS) {
    e.windowStart = now;
    e.consecutiveFailures = 1;
    return;
  }
  e.consecutiveFailures += 1;
  if (e.consecutiveFailures >= FAILURE_THRESHOLD && e.state !== 'OPEN') {
    e.state = 'OPEN';
    e.openedAt = now;
  }
};

export const circuitBreakerInterceptor: HttpInterceptorFn = (req, next) => {
  const toasts = inject(ToastService);
  const family = familyOf(req.url);
  const entry = get(family);
  const now = Date.now();

  // Transition OPEN → HALF_OPEN after the cooldown.
  if (entry.state === 'OPEN' && now - entry.openedAt >= COOLDOWN_MS) {
    entry.state = 'HALF_OPEN';
    log.info('breaker.half_open', { family });
  }

  if (entry.state === 'OPEN') {
    return throwError(() => new HttpErrorResponse({
      url: req.url,
      status: 503,
      statusText: 'Service degraded',
      error: { type: 'urn:breaker:open', title: 'Service degraded — try again shortly', status: 503 },
    }));
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        // Any 2xx — close the breaker; clear failures.
        if (entry.state === 'HALF_OPEN' || entry.consecutiveFailures > 0) {
          entry.state = 'CLOSED';
          entry.consecutiveFailures = 0;
          if (bannerShown) { toasts.success('Service recovered.'); bannerShown = false; }
        }
      }
    }),
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status >= 500) {
        tripIfNeeded(entry, now);
        if (entry.state === 'OPEN' && !bannerShown) {
          toasts.error('Service degraded — some features unavailable.');
          bannerShown = true;
        }
      }
      return throwError(() => err);
    }),
  );
};
