import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ReportsApi } from '../infrastructure/reports-api';
import type { components } from '../../../shared/http/generated/api-schema';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';

type AuditEntry = components['schemas']['AuditEntry'];

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, EmptyStateComponent, LoadingSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Audit log" subtitle="Every state change with actor, target and before/after snapshots." />

    <form [formGroup]="filters" (ngSubmit)="apply()" class="filters">
      <label>
        Actor ID
        <input type="text" formControlName="actor_id" placeholder="user id" />
      </label>
      <label>
        From
        <input type="date" formControlName="date_from" />
      </label>
      <label>
        To
        <input type="date" formControlName="date_to" />
      </label>
      <button type="submit">Filter</button>
      <button type="button" (click)="reset()">Reset</button>
    </form>

    @if (loading()) {
      <app-loading-skeleton [count]="5" />
    } @else if (items().length === 0) {
      <app-empty-state title="No entries" description="Adjust filters or wait for activity." />
    } @else {
      <table>
        <thead>
          <tr>
            <th scope="col">At</th>
            <th scope="col">Actor</th>
            <th scope="col">Kind</th>
            <th scope="col">Entity</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          @for (e of items(); track e.id) {
            <tr (click)="toggle(e.id)" [attr.aria-expanded]="expanded() === e.id">
              <td><time [attr.datetime]="e.at">{{ formatTime(e.at) }}</time></td>
              <td>{{ e.actor_id }}</td>
              <td>{{ e.kind }}</td>
              <td>{{ e.entity }}#{{ e.entity_id }}</td>
              <td>{{ e.reason ?? '' }}</td>
            </tr>
            @if (expanded() === e.id) {
              <tr class="diff">
                <td colspan="5">
                  <div class="snap">
                    <div><strong>Before</strong><pre>{{ pretty(e.before) }}</pre></div>
                    <div><strong>After</strong><pre>{{ pretty(e.after) }}</pre></div>
                  </div>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    .filters { display: flex; gap: var(--space-3); align-items: end; flex-wrap: wrap; margin-bottom: var(--space-4); }
    .filters label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    .filters input { padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--surface-base); color: var(--text-primary); font: inherit; }
    .filters button { padding: var(--space-2) var(--space-4); border: 1px solid var(--border-default); background: var(--surface-raised); color: var(--text-primary); border-radius: var(--radius-md); cursor: pointer; font: inherit; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: var(--space-2) var(--space-3); text-align: left; border-bottom: 1px solid var(--border-default); }
    thead th { color: var(--text-secondary); font-weight: var(--font-weight-strong); }
    tbody tr { cursor: pointer; }
    tbody tr:hover { background: var(--surface-raised); }
    .diff td { background: var(--surface-sunken); }
    .snap { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
    pre { margin: 0; padding: var(--space-2); background: var(--surface-base); border-radius: var(--radius-sm); font-size: var(--font-size-caption); overflow: auto; max-height: 240px; }
    @media (max-width: 767px) { .snap { grid-template-columns: 1fr; } }
  `],
})
export class AuditLogPage {
  private readonly api = inject(ReportsApi);
  private readonly fb = inject(FormBuilder);

  protected readonly filters = this.fb.nonNullable.group({
    actor_id: [''],
    date_from: [''],
    date_to: [''],
  });

  protected readonly items = signal<readonly AuditEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly expanded = signal<string | null>(null);

  constructor() { this.apply(); }

  protected apply(): void {
    const v = this.filters.getRawValue();
    const params: Record<string, string> = {};
    if (v.actor_id)  params['actor_id']  = v.actor_id;
    if (v.date_from) params['date_from'] = v.date_from;
    if (v.date_to)   params['date_to']   = v.date_to;
    this.loading.set(true);
    this.api.auditLog(params).subscribe({
      next: (r) => { this.items.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected reset(): void {
    this.filters.reset({ actor_id: '', date_from: '', date_to: '' });
    this.apply();
  }

  protected formatTime = (iso: string): string => new Date(iso).toLocaleString();
  protected toggle(id: string): void { this.expanded.update((cur) => cur === id ? null : id); }
  protected pretty = (v: unknown): string => v === undefined ? '—' : JSON.stringify(v, null, 2);
}
