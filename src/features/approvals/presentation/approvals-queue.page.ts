import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApprovalsApi } from '../infrastructure/approvals-api';
import { ApprovalQueueItem, ApprovalRouting, ROUTING_LABEL } from '../domain/approval';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { SoftWarningPanelComponent } from '../../../shared/ui/soft-warning-panel.component';
import { BalanceBadgeComponent } from '../../../shared/ui/balance-badge.component';
import { RejectDialogComponent } from './reject-dialog.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';
import { AuthSession } from '../../auth/domain/auth-session';
import { ABSENCE_LABEL } from '../../absences/domain/absence';

@Component({
  selector: 'app-approvals-queue',
  standalone: true,
  imports: [
    PageHeaderComponent, EmptyStateComponent, LoadingSkeletonComponent,
    SoftWarningPanelComponent, BalanceBadgeComponent, RejectDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Approvals" subtitle="Pending requests routed to you, or that you can approve via chain." />

    <div role="tablist" class="filters" aria-label="Filter approvals">
      <button role="tab" [attr.aria-selected]="filter() === 'direct'" (click)="setFilter('direct')">Routed to me</button>
      <button role="tab" [attr.aria-selected]="filter() === 'chain'"  (click)="setFilter('chain')">Via chain</button>
      <button role="tab" [attr.aria-selected]="filter() === undefined" (click)="setFilter(undefined)">All</button>
      <button type="button" class="refresh" (click)="refresh()" aria-label="Refresh">↻</button>
    </div>

    @if (loading()) {
      <app-loading-skeleton [count]="4" />
    } @else if (items().length === 0) {
      <app-empty-state title="No requests waiting on you" description="Submitted vacations, sickdays and other absences will appear here." />
    } @else {
      <ul role="list" class="rows">
        @for (it of items(); track it.absence_id) {
          <li>
            <div class="who">
              <strong>{{ fullName(it) }}</strong>
              <span class="routing" [attr.data-routing]="it.routing">{{ routingLabel(it) }}</span>
            </div>
            <div class="what">
              <span class="type">{{ typeLabel(it) }}</span>
              <span class="dates">{{ it.date_from }} → {{ it.date_to }}</span>
              <span class="days">{{ it.working_days ?? 0 }} working days</span>
              @if (it.has_document) { <span class="badge">document</span> }
            </div>
            <div class="balance">
              <span class="muted">Remaining:</span>
              <app-balance-badge [bucket]="bucketFor(it)" />
            </div>
            @if (it.soft_warnings?.length) {
              <app-soft-warning-panel [warnings]="it.soft_warnings ?? []" />
            }
            <div class="actions">
              @if (isSelf(it)) {
                <span class="hint" role="status">You cannot approve your own request — escalated.</span>
              } @else {
                <button
                  type="button"
                  class="primary"
                  [disabled]="busy() === it.absence_id"
                  (click)="approve(it)">
                  {{ busy() === it.absence_id ? 'Approving…' : 'Approve' }}
                </button>
                <button
                  type="button"
                  class="danger"
                  [disabled]="busy() === it.absence_id"
                  (click)="askReject(it)">
                  Reject…
                </button>
              }
            </div>
          </li>
        }
      </ul>
    }

    @if (rejecting()) {
      <app-reject-dialog
        (confirmed)="reject(rejecting()!, $event)"
        (cancelled)="rejecting.set(null)" />
    }
  `,
  styles: [`
    .filters { display: flex; gap: var(--space-2); margin-bottom: var(--space-4); align-items: center; }
    .filters button {
      padding: var(--space-2) var(--space-3);
      background: transparent; border: 1px solid var(--border-default);
      border-radius: var(--radius-md); cursor: pointer; font: inherit; color: var(--text-secondary);
      &[aria-selected='true'] { background: var(--accent-primary); color: var(--text-inverse); border-color: transparent; }
    }
    .filters .refresh { margin-left: auto; }
    .rows { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-3); }
    li {
      padding: var(--space-4); background: var(--surface-raised); border-radius: var(--radius-md);
      display: grid; gap: var(--space-2);
    }
    .who { display: flex; gap: var(--space-3); align-items: center; }
    .routing {
      font-size: var(--font-size-caption); padding: 0 var(--space-2);
      border-radius: var(--radius-sm); background: var(--state-info-bg); color: var(--state-info-fg);
      &[data-routing='chain'] { background: var(--state-warning-bg); color: var(--state-warning-fg); }
      &[data-routing='hr']    { background: var(--accent-secondary); color: var(--text-inverse); }
    }
    .what { display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; }
    .type { font-weight: var(--font-weight-strong); }
    .dates { color: var(--text-secondary); font-variant-numeric: tabular-nums; }
    .days { color: var(--text-muted); }
    .badge { font-size: var(--font-size-caption); padding: 0 var(--space-2); background: var(--surface-sunken); border-radius: var(--radius-sm); }
    .balance { display: flex; align-items: center; gap: var(--space-2); }
    .muted { color: var(--text-muted); font-size: var(--font-size-caption); }
    .actions { display: flex; gap: var(--space-2); justify-content: flex-end; }
    .actions .primary { background: var(--state-success-fg); color: var(--state-success-bg); }
    .actions .danger  { background: var(--state-error-fg);   color: var(--state-error-bg); }
    .actions button {
      padding: var(--space-2) var(--space-4); border: 0;
      border-radius: var(--radius-md); cursor: pointer; font: inherit;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .hint { color: var(--text-muted); font-size: var(--font-size-caption); padding: var(--space-2); }
  `],
})
export class ApprovalsQueuePage {
  private readonly api = inject(ApprovalsApi);
  private readonly session = inject(AuthSession);
  private readonly toasts = inject(ToastService);

  protected readonly filter = signal<ApprovalRouting | undefined>('direct');
  protected readonly loading = signal(true);
  protected readonly items = signal<readonly ApprovalQueueItem[]>([]);
  protected readonly busy = signal<string | null>(null);
  protected readonly rejecting = signal<ApprovalQueueItem | null>(null);

  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.refresh();
    // 30s polling per FE refinement §7
    this.pollHandle = setInterval(() => this.refresh(true), 30_000);
  }

  ngOnDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  protected setFilter(f: ApprovalRouting | undefined): void {
    this.filter.set(f);
    this.refresh();
  }

  protected refresh(silent = false): void {
    if (!silent) this.loading.set(true);
    this.api.queue(this.filter()).subscribe({
      next: (q) => { this.items.set(q); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  protected fullName = (it: ApprovalQueueItem): string =>
    it.requester ? `${it.requester.first_name} ${it.requester.last_name}` : 'Unknown';

  protected typeLabel = (it: ApprovalQueueItem): string =>
    it.type ? (ABSENCE_LABEL[it.type]?.sk ?? it.type) : '';

  protected routingLabel = (it: ApprovalQueueItem): string =>
    it.routing ? ROUTING_LABEL[it.routing] : '';

  protected isSelf = (it: ApprovalQueueItem): boolean =>
    !!it.requester && it.requester.id === this.session.current()?.id;

  protected bucketFor(it: ApprovalQueueItem): { remaining?: number } {
    return { remaining: it.requester_remaining ?? 0 };
  }

  protected approve(it: ApprovalQueueItem): void {
    if (!it.absence_id) return;
    this.busy.set(it.absence_id);
    this.api.approve(it.absence_id).subscribe({
      next: () => { this.busy.set(null); this.toasts.success('Approved'); this.removeItem(it); },
      error: (e: unknown) => {
        this.busy.set(null);
        this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not approve');
      },
    });
  }

  protected askReject(it: ApprovalQueueItem): void {
    this.rejecting.set(it);
  }

  protected reject(it: ApprovalQueueItem, reason: string): void {
    this.rejecting.set(null);
    if (!it.absence_id) return;
    this.busy.set(it.absence_id);
    this.api.reject(it.absence_id, reason).subscribe({
      next: () => { this.busy.set(null); this.toasts.success('Rejected'); this.removeItem(it); },
      error: (e: unknown) => {
        this.busy.set(null);
        this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not reject');
      },
    });
  }

  private removeItem(it: ApprovalQueueItem): void {
    this.items.update((cur) => cur.filter((x) => x.absence_id !== it.absence_id));
  }
}
