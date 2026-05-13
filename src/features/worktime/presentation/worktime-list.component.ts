import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Worktime, hoursBetween } from '../domain/worktime';
import { WorktimeApi } from '../infrastructure/worktime-api';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { ToastService } from '../../../shared/ui/toast.service';

@Component({
  selector: 'app-worktime-list',
  standalone: true,
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length === 0) {
      <app-empty-state title="No worktime yet today" description="Log your first block above." />
    } @else {
      <ul role="list" class="rows">
        @for (w of items(); track w.id) {
          <li>
            <span class="time">{{ w.start_time }}–{{ w.end_time }}</span>
            <span class="hours">{{ format(w) }}</span>
            <span class="project">{{ w.project_code }}</span>
            @if (w.business_trip) { <span class="badge">BT</span> }
            @if (w.overtime) { <span class="badge overtime">Overtime</span> }
            <button type="button" aria-label="Delete" (click)="remove(w)">Delete</button>
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
      background: var(--surface-raised);
      border-radius: var(--radius-md);
    }
    .time { font-variant-numeric: tabular-nums; min-width: 100px; }
    .hours { color: var(--text-secondary); min-width: 50px; }
    .project { color: var(--text-secondary); flex: 1; }
    .badge {
      padding: 0 var(--space-2); background: var(--state-info-bg); color: var(--state-info-fg);
      border-radius: var(--radius-sm); font-size: var(--font-size-caption);
    }
    .badge.overtime { background: var(--state-warning-bg); color: var(--state-warning-fg); }
    button {
      padding: var(--space-1) var(--space-3);
      background: transparent; border: 1px solid var(--border-default);
      border-radius: var(--radius-sm); cursor: pointer; font: inherit;
      color: var(--text-secondary);
      &:hover { color: var(--state-error-fg); border-color: var(--border-error); }
    }
  `],
})
export class WorktimeListComponent {
  readonly items = input.required<readonly Worktime[]>();

  private readonly api = inject(WorktimeApi);
  private readonly toasts = inject(ToastService);

  protected format(w: Worktime): string {
    return `${hoursBetween(w.start_time, w.end_time).toFixed(1)}h`;
  }

  protected remove(w: Worktime): void {
    if (!confirm('Delete this entry?')) return;
    this.api.remove(w.id).subscribe({
      next: () => this.toasts.success('Entry deleted'),
      error: () => this.toasts.error('Could not delete entry'),
    });
  }
}
