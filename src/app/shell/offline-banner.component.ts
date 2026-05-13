import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, startWith } from 'rxjs';

// FE refinement §2 + §14 — non-blocking banner when offline.
// PWA shell still loads; write attempts get inline "Cannot submit while offline"
// (enforced by individual forms via navigator.onLine; this banner is the global hint).

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!online()) {
      <div role="status" aria-live="polite" class="banner">
        <strong>You are offline.</strong>
        <span>Last refresh {{ lastOnline() }}. Writes are disabled until you reconnect.</span>
      </div>
    }
  `,
  styles: [`
    .banner {
      position: fixed; top: 0; left: 0; right: 0; z-index: 999;
      padding: var(--space-2) var(--space-4);
      background: var(--state-warning-bg); color: var(--state-warning-fg);
      border-bottom: 1px solid var(--border-warning);
      display: flex; gap: var(--space-3); align-items: baseline;
      font-size: var(--font-size-caption);
    }
  `],
})
export class OfflineBannerComponent {
  protected readonly online = signal<boolean>(navigator.onLine);
  protected readonly lastOnline = signal<string>(new Date().toLocaleTimeString());

  constructor() {
    const destroyRef = inject(DestroyRef);
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline'),
    ).pipe(
      startWith(null),
      takeUntilDestroyed(destroyRef),
    ).subscribe(() => {
      const now = navigator.onLine;
      if (now && !this.online()) this.lastOnline.set(new Date().toLocaleTimeString());
      this.online.set(now);
    });
  }
}
