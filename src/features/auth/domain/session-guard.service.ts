import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, throttleTime } from 'rxjs';
import { AuthSession } from './auth-session';
import { log } from '../../../shared/logging/logger';

// Per FE refinement §8 / §17:
// - Idle timeout: 30 min inactivity → silent refresh / re-auth required
// - Hard expiry: 12h since login → forced re-auth
// - Multi-tab: BroadcastChannel sync of logout across tabs

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const HARD_EXPIRY_MS  = 12 * 60 * 60 * 1000;
const CHANNEL_NAME = 'attendance.session';
const LOGIN_TS_KEY = 'attendance.session.loginAt';

type ChannelEvent = { kind: 'logout' };

@Injectable({ providedIn: 'root' })
export class SessionGuard {
  private readonly session = inject(AuthSession);
  private readonly channel: BroadcastChannel | null =
    typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
  private lastActivity = Date.now();
  private idleTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.idleTimer) return;
    const destroyRef = inject(DestroyRef);

    // Track activity from any meaningful user interaction.
    merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'keydown'),
      fromEvent(document, 'click'),
      fromEvent(document, 'touchstart'),
    ).pipe(
      throttleTime(1000),
      takeUntilDestroyed(destroyRef),
    ).subscribe(() => { this.lastActivity = Date.now(); });

    // Stamp loginAt the first time we see a user this run.
    if (this.session.current() && !sessionStorage.getItem(LOGIN_TS_KEY)) {
      sessionStorage.setItem(LOGIN_TS_KEY, String(Date.now()));
    }

    // Poll every 30s for idle / hard expiry. Cheap; runs only while a session exists.
    this.idleTimer = setInterval(() => this.tick(), 30_000);

    // Cross-tab logout sync.
    this.channel?.addEventListener('message', (e: MessageEvent<ChannelEvent>) => {
      if (e.data?.kind === 'logout') this.forceLogout(false);
    });

    // Hidden-tab clear: if hidden longer than the idle window, force logout on return.
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        if (document.visibilityState === 'visible' && Date.now() - this.lastActivity > IDLE_TIMEOUT_MS) {
          this.forceLogout(true);
        }
      });
  }

  /** Broadcast a logout to peer tabs and clear this one. */
  broadcastLogout(): void {
    try { this.channel?.postMessage({ kind: 'logout' } satisfies ChannelEvent); } catch { /* noop */ }
    this.forceLogout(false);
  }

  private tick(): void {
    if (!this.session.current()) return;

    const loginAt = Number(sessionStorage.getItem(LOGIN_TS_KEY) ?? Date.now());
    const idleFor = Date.now() - this.lastActivity;
    const livedFor = Date.now() - loginAt;

    if (livedFor >= HARD_EXPIRY_MS) {
      log.info('session.hard_expiry');
      this.forceLogout(true);
      return;
    }
    if (idleFor >= IDLE_TIMEOUT_MS) {
      log.info('session.idle_timeout');
      this.forceLogout(true);
      return;
    }
  }

  private forceLogout(redirect: boolean): void {
    this.session.signOut();
    sessionStorage.removeItem(LOGIN_TS_KEY);
    if (this.idleTimer) { clearInterval(this.idleTimer); this.idleTimer = null; }
    if (redirect) location.assign('/logged-out');
  }
}
