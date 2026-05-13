import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { ApiClient } from '../http/api-client';
import { log } from '../logging/logger';

// Per FE refinement §30.
// Server-driven flag manifest fetched on startup; refreshed on focus.
// Unknown flags default to `false` so a missing flag never breaks production.
// Audience filtering happens on the server before flags reach the FE.

export interface FeatureFlag {
  readonly key: string;
  readonly enabled: boolean;
}

const STORAGE_KEY = 'attendance.flags.cache';

@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly api = inject(ApiClient);
  private readonly flags = signal<Readonly<Record<string, boolean>>>(this.readCache());

  /** App-initializer hook: fetches once, then on visibilitychange. */
  async refresh(): Promise<void> {
    try {
      const list = await firstValueFrom(
        this.api.get<FeatureFlag[]>('/feature-flags').pipe(
          timeout(5_000),
          catchError(() => of([] as FeatureFlag[])),
        ),
      );
      const map: Record<string, boolean> = {};
      for (const f of list) map[f.key] = f.enabled;
      this.flags.set(map);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {/* tolerate */}
    } catch (e: unknown) {
      log.warn('flags.refresh_failed', { err: String(e) });
    }
  }

  /** Signal that re-emits when flags reload — use in templates as `flag('foo')()`. */
  flag(key: string): () => boolean {
    return computed(() => this.flags()[key] === true);
  }

  /** Synchronous boolean lookup — for non-template callers. */
  isEnabled(key: string): boolean {
    return this.flags()[key] === true;
  }

  private readCache(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as Record<string, boolean> : {};
    } catch {
      return {};
    }
  }
}
