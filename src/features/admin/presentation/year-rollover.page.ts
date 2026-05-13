import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminApi } from '../infrastructure/admin-api';
import type { components } from '../../../shared/http/generated/api-schema';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';

type Row = components['schemas']['YearRolloverRow'];

@Component({
  selector: 'app-year-rollover',
  standalone: true,
  imports: [LoadingSkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Year rollover</h3>
    <p>Dry-run shows what <em>would</em> happen. Apply commits the change for everyone.</p>

    <div class="actions">
      <button type="button" (click)="preview()" [disabled]="busy()">{{ previewing() ? 'Computing…' : 'Run preview' }}</button>
      <button type="button" class="apply" (click)="apply()" [disabled]="busy() || rows().length === 0">
        {{ applying() ? 'Applying…' : 'Apply (irreversible)' }}
      </button>
    </div>

    @if (loading()) {
      <app-loading-skeleton [count]="5" />
    } @else if (rows().length === 0) {
      <app-empty-state title="No preview yet" description="Click Run preview to load each user's projected new allocation." />
    } @else {
      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Leftover statutory</th>
            <th>Leftover bonus</th>
            <th>Carry-over</th>
            <th>New statutory</th>
            <th>New bonus</th>
            <th>Withheld?</th>
          </tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.user_id) {
            <tr [class.withheld]="r.bonus_withheld">
              <td>{{ r.user_id }}</td>
              <td>{{ r.leftover_statutory ?? 0 }}</td>
              <td>{{ r.leftover_bonus ?? 0 }}</td>
              <td>{{ r.carry_over ?? 0 }}</td>
              <td>{{ r.new_year_statutory ?? 0 }}</td>
              <td>{{ r.new_year_bonus ?? 0 }}</td>
              <td>{{ r.bonus_withheld ? 'yes' : 'no' }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    h3 { margin: 0 0 var(--space-2) 0; font-size: var(--font-size-heading-sm); }
    p { color: var(--text-secondary); margin: 0 0 var(--space-3) 0; }
    .actions { display: flex; gap: var(--space-3); margin-bottom: var(--space-3); }
    button { padding: var(--space-2) var(--space-4); background: var(--surface-raised); color: var(--text-primary); border: 1px solid var(--border-default); border-radius: var(--radius-md); cursor: pointer; font: inherit; &:disabled { opacity: 0.5; cursor: not-allowed; } }
    button.apply { background: var(--state-warning-fg); color: var(--state-warning-bg); border-color: transparent; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: var(--space-2); text-align: left; border-bottom: 1px solid var(--border-default); font-variant-numeric: tabular-nums; }
    thead th { color: var(--text-secondary); }
    tr.withheld { background: var(--state-warning-bg); color: var(--state-warning-fg); }
  `],
})
export class YearRolloverPage {
  private readonly api = inject(AdminApi);
  private readonly toasts = inject(ToastService);

  protected readonly rows = signal<readonly Row[]>([]);
  protected readonly loading = signal(false);
  protected readonly previewing = signal(false);
  protected readonly applying = signal(false);

  protected busy = () => this.previewing() || this.applying();

  protected preview(): void {
    this.previewing.set(true); this.loading.set(true);
    this.api.previewRollover().subscribe({
      next: (res) => { this.rows.set(res.rows); this.previewing.set(false); this.loading.set(false); },
      error: (e: unknown) => {
        this.previewing.set(false); this.loading.set(false);
        this.toasts.error(e instanceof ApiError ? e.problem.title : 'Preview failed');
      },
    });
  }

  protected apply(): void {
    if (!confirm('Apply year-rollover for ALL users? This is irreversible.')) return;
    this.applying.set(true);
    this.api.applyRollover().subscribe({
      next: (res) => { this.rows.set(res.rows); this.applying.set(false); this.toasts.success('Year rollover applied'); },
      error: (e: unknown) => {
        this.applying.set(false);
        this.toasts.error(e instanceof ApiError ? e.problem.title : 'Apply failed');
      },
    });
  }
}
