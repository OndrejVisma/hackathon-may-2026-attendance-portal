import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Absence, stateLabel, stateTone, ABSENCE_LABEL } from '../domain/absence';
import { AbsencesApi } from '../infrastructure/absences-api';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';

@Component({
  selector: 'app-my-absences',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length === 0) {
      <app-empty-state title="No absences" description="Submitted vacations, sickdays and other absences will show up here." />
    } @else {
      <ul role="list" class="rows">
        @for (a of items(); track a.id) {
          <li>
            <span class="type">{{ typeLabel(a) }}</span>
            <span class="dates">{{ a.date_from }}{{ a.date_to !== a.date_from ? ' → ' + a.date_to : '' }}</span>
            @if (a.half_day) { <span class="half">half-day {{ a.half_day_slot }}</span> }
            <span class="state" [attr.data-tone]="tone(a)">{{ stateOf(a) }}</span>
            @if (canWithdraw(a)) {
              <button type="button" (click)="withdraw(a)">Withdraw</button>
            } @else if (canCancel(a)) {
              <button type="button" (click)="cancel(a)">Cancel</button>
            }
          </li>
        }
      </ul>
    }
  `,
  styles: [`
    .rows { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-2); }
    li {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      background: var(--surface-raised); border-radius: var(--radius-md);
    }
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
    button {
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

  protected typeLabel = (a: Absence): string => ABSENCE_LABEL[a.type]?.sk ?? a.type;
  protected stateOf = (a: Absence): string => stateLabel[a.state];
  protected tone = (a: Absence): string => stateTone[a.state];

  protected canWithdraw = (a: Absence): boolean => a.state === 'pending';
  protected canCancel   = (a: Absence): boolean => a.state === 'approved' && a.date_from > new Date().toISOString().slice(0, 10);

  protected withdraw(a: Absence): void {
    this.api.withdraw(a.id).subscribe({
      next: () => this.toasts.success('Withdrawn'),
      error: (e: unknown) => this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not withdraw'),
    });
  }

  protected cancel(a: Absence): void {
    if (!confirm('Cancel this approved absence? Your quota will be refunded.')) return;
    this.api.cancel(a.id).subscribe({
      next: () => this.toasts.success('Cancelled — quota refunded'),
      error: (e: unknown) => this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not cancel'),
    });
  }
}
