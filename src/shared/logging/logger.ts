// Single logger module per FE refinement §31.
// Import `log` everywhere. `console.*` is lint-forbidden outside this file + tests.

import { isDevMode } from '@angular/core';

type Level = 'debug' | 'info' | 'warn' | 'error';

const REDACTED_KEYS = ['token', 'password', 'secret', 'authorization', 'cookie'];

const redact = (data: unknown): unknown => {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = REDACTED_KEYS.includes(k.toLowerCase()) ? '[REDACTED]' : redact(v);
  }
  return out;
};

const emit = (level: Level, event: string, data?: unknown): void => {
  if (level === 'debug' && !isDevMode()) return;
  const payload = data !== undefined ? redact(data) : undefined;
  // eslint-disable-next-line no-console
  const sink = console[level] ?? console.log;
  if (payload !== undefined) sink(event, payload); else sink(event);
};

export const log = {
  debug: (event: string, data?: unknown): void => emit('debug', event, data),
  info:  (event: string, data?: unknown): void => emit('info', event, data),
  warn:  (event: string, data?: unknown): void => emit('warn', event, data),
  error: (event: string, data?: unknown): void => emit('error', event, data),
};
