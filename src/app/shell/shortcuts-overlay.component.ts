import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';

// FE refinement §35 — keyboard shortcuts.
// `?` opens this overlay; `g d|c|a|n|s` are go-to shortcuts; Esc closes any modal.
// List shortcuts (j/k/Enter/a/r) are owned by individual list pages.

interface Shortcut {
  readonly key: string;
  readonly description: string;
}

const GLOBAL: readonly Shortcut[] = [
  { key: '?',     description: 'Open this shortcuts help' },
  { key: 'g d',   description: 'Go to dashboard (my day)' },
  { key: 'g b',   description: 'Go to balances' },
  { key: 'g n',   description: 'Go to notifications' },
  { key: 'g a',   description: 'Go to approvals' },
  { key: 'g c',   description: 'Go to team calendar' },
  { key: 'g h',   description: 'Go to HR' },
  { key: 'g s',   description: 'Go to admin (settings)' },
  { key: 't',     description: 'Toggle theme (light/dark)' },
  { key: 'l',     description: 'Toggle locale (SK/EN)' },
  { key: 'Esc',   description: 'Close any modal or side panel' },
];

const LIST: readonly Shortcut[] = [
  { key: 'j',     description: 'Move focus to next row' },
  { key: 'k',     description: 'Move focus to previous row' },
  { key: 'Enter', description: 'Open the focused row' },
  { key: 'a',     description: 'Approve focused request (manager/HR)' },
  { key: 'r',     description: 'Reject focused request (manager/HR)' },
];

@Component({
  selector: 'app-shortcuts-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <dialog #dlg aria-labelledby="shortcuts-h" (close)="close()">
        <div class="card">
          <header>
            <h2 id="shortcuts-h">Keyboard shortcuts</h2>
            <button type="button" (click)="close()" aria-label="Close">×</button>
          </header>
          <section>
            <h3>Global</h3>
            <dl>
              @for (s of global; track s.key) {
                <dt><kbd>{{ s.key }}</kbd></dt>
                <dd>{{ s.description }}</dd>
              }
            </dl>
          </section>
          <section>
            <h3>On lists (approvals, audit, notifications)</h3>
            <dl>
              @for (s of list; track s.key) {
                <dt><kbd>{{ s.key }}</kbd></dt>
                <dd>{{ s.description }}</dd>
              }
            </dl>
          </section>
        </div>
      </dialog>
    }
  `,
  styles: [`
    dialog { padding: 0; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--surface-base); color: var(--text-primary); max-width: min(640px, 92vw); }
    dialog::backdrop { background: rgba(0, 0, 0, 0.4); }
    .card { padding: var(--space-6); }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
    h2 { margin: 0; font-size: var(--font-size-heading-md); }
    h3 { margin: var(--space-4) 0 var(--space-2) 0; font-size: var(--font-size-heading-sm); color: var(--text-secondary); }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-2) var(--space-4); margin: 0; }
    dt { text-align: right; }
    dd { margin: 0; }
    kbd {
      display: inline-block;
      padding: 2px var(--space-2);
      background: var(--surface-sunken);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: var(--font-size-caption);
    }
    header button {
      padding: var(--space-1) var(--space-3);
      background: transparent; border: 0; color: var(--text-secondary);
      font-size: var(--font-size-heading-md); cursor: pointer;
    }
  `],
})
export class ShortcutsOverlayComponent {
  @ViewChild('dlg') private dlgRef?: ElementRef<HTMLDialogElement>;

  private readonly router = inject(Router);
  protected readonly open = signal(false);
  protected readonly global = GLOBAL;
  protected readonly list = LIST;

  private pendingPrefix: string | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    fromEvent<KeyboardEvent>(window, 'keydown')
      .pipe(filter((e) => !this.isInputTarget(e)), takeUntilDestroyed(destroyRef))
      .subscribe((e) => this.handle(e));
  }

  protected close(): void {
    this.open.set(false);
    this.dlgRef?.nativeElement.close();
  }

  private isInputTarget(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    if (!t) return false;
    const tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
  }

  private handle(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    // `?` toggles the overlay.
    if (e.key === '?') {
      e.preventDefault();
      const next = !this.open();
      this.open.set(next);
      queueMicrotask(() => {
        if (next) this.dlgRef?.nativeElement.showModal();
        else this.dlgRef?.nativeElement.close();
      });
      return;
    }

    if (e.key === 'Escape' && this.open()) {
      this.close();
      return;
    }

    // Two-key `g <X>` chord.
    if (this.pendingPrefix === 'g') {
      this.clearPending();
      const route = this.gotoRoute(e.key);
      if (route) { e.preventDefault(); void this.router.navigate([route]); }
      return;
    }
    if (e.key === 'g') {
      this.pendingPrefix = 'g';
      this.pendingTimer = setTimeout(() => this.clearPending(), 1200);
      return;
    }

    if (e.key === 't') document.querySelector<HTMLButtonElement>('[aria-label="Toggle theme"]')?.click();
    if (e.key === 'l') document.querySelector<HTMLButtonElement>('[aria-label^="Locale:"]')?.click();
  }

  private clearPending(): void {
    this.pendingPrefix = null;
    if (this.pendingTimer) { clearTimeout(this.pendingTimer); this.pendingTimer = null; }
  }

  private gotoRoute(key: string): string | null {
    switch (key.toLowerCase()) {
      case 'd': return '/me';
      case 'b': return '/balances';
      case 'n': return '/notifications';
      case 'a': return '/approvals';
      case 'c': return '/team-calendar';
      case 'h': return '/hr';
      case 's': return '/admin';
      default:  return null;
    }
  }
}
