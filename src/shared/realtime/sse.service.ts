import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, share } from 'rxjs';
import { API_CONFIG } from '../http/api-config';
import { AuthSession } from '../../features/auth/domain/auth-session';
import { log } from '../logging/logger';

// Per FE refinement §7 Bonus.
// Subscribes to a server-sent-events stream at /events. Server emits JSON
// payloads of shape { kind, ...data } so consumers filter on kind.
// Graceful degradation: when the stream fails to open or drops, callers
// keep using polling (which is the Basic-tier baseline anyway). The signal
// `connected` reflects state for any UI that wants to render a pill.

export interface RealtimeEvent {
  readonly kind: string;
  readonly [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class SseService {
  private readonly cfg = inject(API_CONFIG);
  private readonly session = inject(AuthSession);

  readonly connected = signal(false);
  private source: EventSource | null = null;
  private readonly events$ = new Subject<RealtimeEvent>();
  private readonly shared$ = this.events$.asObservable().pipe(share());

  /** Stream of all server events. Filter by `kind` in your subscriber. */
  stream(): Observable<RealtimeEvent> {
    this.ensureOpen();
    return this.shared$;
  }

  private ensureOpen(): void {
    if (this.source) return;
    const token = this.session.accessToken();
    if (!token) return;

    // Browsers don't allow custom headers on EventSource. Token via query
    // param is fine for a hackathon mock; real BE would use a short-lived
    // cookie or token in a one-time fetch handshake.
    const url = `${this.cfg.baseUrl}/events?token=${encodeURIComponent(token)}`;

    try {
      this.source = new EventSource(url);
    } catch (err: unknown) {
      log.warn('sse.open_failed', { err: String(err) });
      return;
    }

    this.source.addEventListener('open', () => {
      this.connected.set(true);
      log.info('sse.connected');
    });

    this.source.addEventListener('message', (e: MessageEvent<string>) => {
      try {
        const data = JSON.parse(e.data) as RealtimeEvent;
        this.events$.next(data);
      } catch {/* malformed payloads are ignored */}
    });

    this.source.addEventListener('error', () => {
      this.connected.set(false);
      // Browser auto-reconnects EventSource; nothing to do.
    });
  }

  /** Tear down — called when the session ends. */
  close(): void {
    this.source?.close();
    this.source = null;
    this.connected.set(false);
  }
}
