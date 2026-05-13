import { Injectable, ErrorHandler, inject } from '@angular/core';
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { TELEMETRY_CONFIG } from './telemetry-config';
import { log } from '../logging/logger';

interface BeaconBase {
  readonly app: string;
  readonly release: string;
  readonly session_id: string;
  readonly url: string;
  readonly ts: number;
  readonly dnt: boolean;
}

interface VitalBeacon extends BeaconBase {
  readonly kind: 'vital';
  readonly metric: string;       // LCP | INP | CLS
  readonly value: number;
  readonly rating: string;       // good | needs-improvement | poor
}

interface ErrorBeacon extends BeaconBase {
  readonly kind: 'error';
  readonly message: string;
  readonly stack?: string;
}

type Beacon = VitalBeacon | ErrorBeacon;

const SESSION_ID = Math.random().toString(36).slice(2);

// Filter token-like fields out of any payload before transmitting.
const SAFE_FIELDS = new Set(['kind', 'metric', 'value', 'rating', 'message', 'stack', 'app', 'release', 'session_id', 'url', 'ts', 'dnt']);
const sanitise = (data: object): object => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SAFE_FIELDS.has(k)) out[k] = v;
  }
  return out;
};

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  private readonly cfg = inject(TELEMETRY_CONFIG);

  /** Called from app initializer. Idempotent — guarded by `cfg.enabled`. */
  start(): void {
    if (!this.cfg.enabled) return;
    if (navigator.doNotTrack === '1') {
      log.info('telemetry.dnt_respected');
      return;
    }
    if (Math.random() <= this.cfg.vitalsSampleRate) {
      onLCP((m) => this.sendVital(m));
      onINP((m) => this.sendVital(m));
      onCLS((m) => this.sendVital(m));
    }
  }

  sendError(err: Error | unknown): void {
    if (!this.cfg.enabled) return;
    if (Math.random() > this.cfg.errorSampleRate) return;
    const beacon: ErrorBeacon = {
      ...this.base(),
      kind: 'error',
      message: err instanceof Error ? err.message : String(err),
      ...(err instanceof Error && err.stack ? { stack: err.stack } : {}),
    };
    this.send(beacon);
  }

  private sendVital(m: Metric): void {
    const beacon: VitalBeacon = {
      ...this.base(),
      kind: 'vital',
      metric: m.name,
      value: m.value,
      rating: m.rating,
    };
    this.send(beacon);
  }

  private base(): BeaconBase {
    return {
      app: this.cfg.app,
      release: this.cfg.release,
      session_id: SESSION_ID,
      url: location.pathname,
      ts: Date.now(),
      dnt: navigator.doNotTrack === '1',
    };
  }

  private send(beacon: Beacon): void {
    const body = JSON.stringify(sanitise(beacon));
    try {
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(this.cfg.endpoint, new Blob([body], { type: 'application/json' }));
        return;
      }
      void fetch(this.cfg.endpoint, {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e: unknown) {
      log.warn('telemetry.send_failed', { err: String(e) });
    }
  }
}

@Injectable()
export class TelemetryErrorHandler implements ErrorHandler {
  private readonly telemetry = inject(TelemetryService);

  handleError(err: unknown): void {
    log.error('app.unhandled_error', { message: err instanceof Error ? err.message : String(err) });
    this.telemetry.sendError(err);
    // Re-throw to keep dev tools / framework default behaviour.
    if (err instanceof Error) throw err;
  }
}
