import { InjectionToken } from '@angular/core';

// Per FE refinement §10 (Core Web Vitals) + §18 (errors).
// The endpoint receives JSON beacons via fetch keepalive (or sendBeacon).
// Disabled by default; enable per environment via env-var-driven config.

export interface TelemetryConfig {
  readonly enabled: boolean;
  /** Where to POST event JSON. Origin must be in CSP `connect-src` (§17). */
  readonly endpoint: string;
  /** Anonymous service id for grouping events. */
  readonly app: string;
  /** Build-time release identifier — used for source-map correlation. */
  readonly release: string;
  /** Per-session sample rate for Core Web Vitals (0..1). */
  readonly vitalsSampleRate: number;
  /** Per-session sample rate for unhandled errors (0..1). */
  readonly errorSampleRate: number;
}

export const TELEMETRY_CONFIG = new InjectionToken<TelemetryConfig>('TELEMETRY_CONFIG');

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: false,
  endpoint: '',
  app: 'attendance-portal-fe',
  release: 'dev',
  vitalsSampleRate: 0.25,
  errorSampleRate: 1.0,
};
