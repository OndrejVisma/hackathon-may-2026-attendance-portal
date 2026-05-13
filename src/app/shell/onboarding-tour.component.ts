import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthSession } from '../../features/auth';

// Per FE refinement §36.
// 3-step guided tour shown on first authenticated session.
// Skippable, dismissable forever ("Don't show me this again").
// Anchors to real DOM elements via querySelector + a stable selector
// declared per step. Non-modal popover: dimmed backdrop + a card pointing
// at the target.

const STORAGE_KEY = 'attendance.onboarding.completed';

interface Step {
  readonly title: string;
  readonly body: string;
  readonly anchorSelector: string;        // CSS selector the popover points at
  readonly route?: string;                 // optional navigation before showing
}

const STEPS_EMPLOYEE: readonly Step[] = [
  { title: 'Your day starts here', body: 'Log worktime blocks and review today\'s entries from this page.',
    anchorSelector: 'a[routerlink="/me"]' },
  { title: 'Submit absences', body: 'Vacation, sickday, paragraph and more — submitted requests appear in your list and route to your manager.',
    anchorSelector: 'a[routerlink="/absences/new"]', route: '/me' },
  { title: 'Track your balance', body: 'Statutory + bonus vacation, sickday quota and paragraph allocations live here. The badge shows reserved days before approval.',
    anchorSelector: 'a[routerlink="/balances"]' },
];

@Component({
  selector: 'app-onboarding-tour',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="backdrop" (click)="dismiss(true)" aria-hidden="true"></div>
      <div class="card"
           role="dialog"
           aria-modal="true"
           aria-labelledby="tour-h"
           [style.top.px]="anchorTop()"
           [style.left.px]="anchorLeft()">
        <h2 id="tour-h">{{ current().title }}</h2>
        <p>{{ current().body }}</p>
        <footer>
          <span class="dots" aria-hidden="true">
            @for (s of steps; track $index) {
              <span class="dot" [class.active]="$index === index()"></span>
            }
          </span>
          <button type="button" class="ghost" (click)="dismiss(true)">Don't show again</button>
          @if (!isLast()) {
            <button type="button" class="ghost" (click)="dismiss(false)">Skip</button>
            <button type="button" class="primary" (click)="next()">Next</button>
          } @else {
            <button type="button" class="primary" (click)="dismiss(true)">Got it</button>
          }
        </footer>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.25); z-index: 900;
    }
    .card {
      position: fixed; z-index: 901;
      background: var(--surface-base); color: var(--text-primary);
      border: 1px solid var(--border-default); border-radius: var(--radius-md);
      box-shadow: var(--shadow-3);
      padding: var(--space-4); width: min(360px, 92vw);
    }
    h2 { margin: 0 0 var(--space-2) 0; font-size: var(--font-size-heading-sm); }
    p  { margin: 0 0 var(--space-3) 0; color: var(--text-secondary); }
    footer { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
    .dots { display: flex; gap: 4px; margin-right: auto; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-default); }
    .dot.active { background: var(--accent-primary); }
    button { padding: var(--space-2) var(--space-3); font: inherit; cursor: pointer; border-radius: var(--radius-md); }
    button.ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border-default); }
    button.primary { background: var(--accent-primary); color: var(--text-inverse); border: 0; }
  `],
})
export class OnboardingTourComponent {
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly steps = STEPS_EMPLOYEE;     // future: manager/hr/admin role-aware tours
  protected readonly index = signal(0);
  protected readonly anchorTop = signal(80);
  protected readonly anchorLeft = signal(80);

  protected readonly visible = signal(false);
  protected current = computed((): Step => this.steps[this.index()] ?? this.steps[0]!);
  protected isLast = computed((): boolean => this.index() === this.steps.length - 1);

  constructor() {
    effect(() => {
      const u = this.session.user();
      if (!u) { this.visible.set(false); return; }
      if (localStorage.getItem(STORAGE_KEY) === 'true') { this.visible.set(false); return; }
      // Defer to next tick so the layout shell has rendered its links.
      queueMicrotask(() => this.show(0));
    });

    // Reposition when the viewport changes.
    fromEvent(window, 'resize').pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.positionAt(this.current().anchorSelector));

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => queueMicrotask(() => this.positionAt(this.current().anchorSelector)));
  }

  protected next(): void {
    const i = this.index();
    if (i >= this.steps.length - 1) { this.dismiss(true); return; }
    this.show(i + 1);
  }

  protected dismiss(remember: boolean): void {
    if (remember) localStorage.setItem(STORAGE_KEY, 'true');
    this.visible.set(false);
  }

  private show(i: number): void {
    this.index.set(i);
    const step = this.current();
    if (step.route) void this.router.navigate([step.route]);
    this.positionAt(step.anchorSelector);
    this.visible.set(true);
  }

  private positionAt(selector: string): void {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) { this.anchorTop.set(80); this.anchorLeft.set(80); return; }
    const rect = el.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 220, rect.bottom + 8);
    const left = Math.min(window.innerWidth - 380, Math.max(8, rect.left));
    this.anchorTop.set(top);
    this.anchorLeft.set(left);
  }
}
