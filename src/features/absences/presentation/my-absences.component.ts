import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Absence, stateLabel, stateTone, ABSENCE_LABEL } from '../domain/absence';
import { AbsencesApi } from '../infrastructure/absences-api';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';

type Filter = 'all' | 'pending' | 'approved' | 'past';

const today = (): string => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-my-absences',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="tablist" aria-label="Filter absences" class="filters">
      <button role="tab" [attr.aria-selected]="filter() === 'all'"      (click)="set('all')">All</button>
      <button role="tab" [attr.aria-selected]="filter() === 'pending'"  (click)="set('pending')">Pending</button>
      <button role="tab" [attr.aria-selected]="filter() === 'approved'" (click)="set('approved')">Approved</button>
      <button role="tab" [attr.aria-selected]="filter() === 'past'"     (click)="set('past')">Past</button>
    </div>

    @if (visible().length === 0) {
      <app-empty-state title="Nothing here" [description]="emptyHint()" />
    } @else {
      <ul role="list" class="rows">
        @for (a of visible(); track a.id) {
          <li>
            <a [routerLink]="['/absences', a.id]" class="link">
              <span class="type">{{ typeLabel(a) }}</span>
              <span class="dates">{{ a.date_from }}{{ a.date_to !== a.date_from ? ' → ' + a.date_to : '' }}</span>
              @if (a.half_day) { <span class="half">half-day {{ a.half_day_slot }}</span> }
              <span class="state" [attr.data-tone]="tone(a)">{{ stateOf(a) }}</span>
            </a>
            @if (canWithdraw(a)) {
              <button type="button" (click)="withdraw(a, $event)">Withdraw</button>
            } @else if (canCancel(a)) {
              <button type="button" (click)="cancel(a, $event)">Cancel</button>
            }
          </li>
        }
      </ul>
    }
  `,
  styles: [`
    .filters { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); }
    .filters button {
      padding: var(--space-1) var(--space-3);
      background: transparent; border: 1px solid var(--border-default);
      border-radius: var(--radius-pill); cursor: pointer; font: inherit;
      color: var(--text-secondary);
      &[aria-selected='true'] { background: var(--accent-primary); color: var(--text-inverse); border-color: transparent; }
    }
    .rows { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-2); }
    li {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      background: var(--surface-raised); border-radius: var(--radius-md);
    }
    .link { display: flex; align-items: center; gap: var(--space-3); flex: 1; color: inherit; text-decoration: none; }
    .link:hover { color: var(--accent-primary); }
    .type { min-width: 140px; font-weight: var(--font-weight-strong); }
    .dates { color: var(--text-secondary); font-variant-numeric: tabular-nums; }
    .half { color: var(--text-muted); font-size: var(--font-size-caption); }
    .state {
      margin-left: auto;
      padding: 0 var(--space-2); border-radius: var(--radius-sm); font-size: var(--font-size-caption);
      &[data-tone='success'] { background: var(--state-success-bg); color: var(--state-success-fg); }
      &[data-tone='error']   { background: var(--state-error-bg);   color: var(--state-error-fg); }
      &[data-tone='warning'] { background: var(--state-warning-bg); color: var(--state-warning-fg); }
      &[data-tone='info']    { background: var(--state-info-bg);    color: var(--state-info-fg); }
    }
    li > button {
      padding: var(--space-1) var(--space-3);
      background: transparent; border: 1px solid var(--border-default);
      border-radius: var(--radius-sm); cursor: pointer; font: inherit; color: var(--text-secondary);
    }
  `],
})
export class MyAbsencesComponent {
  readonly items = input.required<readonly Absence[]>();

  private readonly api = inject(AbsencesApi);
  private readonly toasts = inject(ToastService);
  protected readonly filter = signal<Filter>('all');

  protected readonly visible = computed(() => {
    const items = this.items();
    const f = this.filter();
    const t = today();
    switch (f) {
      case 'pending':  return items.filter((a) => a.state === 'pending');
      case 'approved': return items.filter((a) => a.state === 'approved' && a.date_to >= t);
      case 'past':     return items.filter((a) => a.date_to < t);
      default:         return items;
    }
  });

  protected readonly emptyHint = computed((): string => {
    switch (this.filter()) {
      case 'pending':  return 'No pending requests.';
      case 'approved': return 'No approved upcoming or current absences.';
      case 'past':     return 'No past absences yet.';
      default:         return 'Submit your first vacation, sickday or other absence.';
    }
  });

  protected typeLabel = (a: Absence): string => ABSENCE_LABEL[a.type]?.sk ?? a.type;
  protected stateOf = (a: Absence): string => stateLabel[a.state];
  protected tone = (a: Absence): string => stateTone[a.state];

  protected canWithdraw = (a: Absence): boolean => a.state === 'pending';
  protected canCancel   = (a: Absence): boolean => a.state === 'approved' && a.date_from > today();

  protected set(f: Filter): void { this.filter.set(f); }

  protected withdraw(a: Absence, ev: Event): void {
    ev.stopPropagation(); ev.preventDefault();
    this.api.withdraw(a.id).subscribe({
      next: () => this.toasts.success('Withdrawn'),
      error: (e: unknown) => this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not withdraw'),
    });
  }

  protected cancel(a: Absence, ev: Event): void {
    ev.stopPropagation(); ev.preventDefault();
    if (!confirm('Cancel this approved absence? Your quota will be refunded.')) return;
    this.api.cancel(a.id).subscribe({
      next: () => this.toasts.success('Cancelled — quota refunded'),
      error: (e: unknown) => this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not cancel'),
    });
  }
}
