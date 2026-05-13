import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AbsencesApi } from '../infrastructure/absences-api';
import { ApprovalsApi } from '../../approvals/infrastructure/approvals-api';
import { Absence, ABSENCE_LABEL, stateLabel, stateTone } from '../domain/absence';
import { AuthSession, hasRole } from '../../auth';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { SoftWarningPanelComponent } from '../../../shared/ui/soft-warning-panel.component';
import { ErrorBannerComponent } from '../../../shared/ui/error-banner.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';
import { RejectDialogComponent } from '../../approvals/presentation/reject-dialog.component';

@Component({
  selector: 'app-absence-detail',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent, LoadingSkeletonComponent, SoftWarningPanelComponent,
    ErrorBannerComponent, RejectDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Absence detail" />

    @if (loading()) {
      <app-loading-skeleton [count]="6" />
    } @else {
    @if (absence(); as a) {
      <article class="card">
        <header>
          <h2>{{ typeLabel(a) }}</h2>
          <span class="state" [attr.data-tone]="tone(a)">{{ stateOf(a) }}</span>
        </header>

        <dl>
          <dt>User</dt>            <dd>{{ a.user_id }}</dd>
          <dt>Dates</dt>           <dd>{{ a.date_from }} → {{ a.date_to }}</dd>
          @if (a.half_day) { <dt>Half day</dt><dd>{{ a.half_day_slot }}</dd> }
          @if (a.working_days !== undefined) { <dt>Working days</dt><dd>{{ a.working_days }}</dd> }
          @if (a.comment) { <dt>Comment</dt><dd>{{ a.comment }}</dd> }
          @if (a.submitted_at) { <dt>Submitted</dt><dd><time [attr.datetime]="a.submitted_at">{{ format(a.submitted_at) }}</time></dd> }
          @if (a.decided_at) { <dt>Decided</dt><dd><time [attr.datetime]="a.decided_at">{{ format(a.decided_at) }}</time> by {{ a.decided_by ?? '?' }}</dd> }
          @if (a.reject_reason) { <dt>Reject reason</dt><dd>{{ a.reject_reason }}</dd> }
        </dl>

        @if (a.soft_warnings?.length) {
          <app-soft-warning-panel [warnings]="a.soft_warnings ?? []" />
        }

        <app-error-banner [error]="error()" />

        <footer class="actions">
          <a routerLink="/me" class="back">Back to my day</a>
          @if (showWithdraw()) {
            <button type="button" (click)="withdraw(a)" [disabled]="busy()">Withdraw</button>
          }
          @if (showCancel()) {
            <button type="button" (click)="cancel(a)" [disabled]="busy()">Cancel</button>
          }
          @if (showHrOverride()) {
            <button type="button" class="danger" (click)="askOverride()" [disabled]="busy()">
              HR override → Rejected
            </button>
          }
        </footer>
      </article>
    } @else {
      <p>Absence not found.</p>
    }
    }

    @if (overriding()) {
      <app-reject-dialog (confirmed)="override($event)" (cancelled)="overriding.set(false)" />
    }
  `,
  styles: [`
    .card { background: var(--surface-raised); border-radius: var(--radius-md); padding: var(--space-6); max-width: 720px; }
    header { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
    h2 { margin: 0; font-size: var(--font-size-heading-md); }
    .state {
      padding: 0 var(--space-2); border-radius: var(--radius-sm); font-size: var(--font-size-caption);
      &[data-tone='success'] { background: var(--state-success-bg); color: var(--state-success-fg); }
      &[data-tone='error']   { background: var(--state-error-bg);   color: var(--state-error-fg); }
      &[data-tone='warning'] { background: var(--state-warning-bg); color: var(--state-warning-fg); }
      &[data-tone='info']    { background: var(--state-info-bg);    color: var(--state-info-fg); }
    }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-2) var(--space-4); margin: 0 0 var(--space-4) 0; }
    dt { color: var(--text-secondary); font-size: var(--font-size-caption); }
    dd { margin: 0; }
    .actions { display: flex; gap: var(--space-3); margin-top: var(--space-4); }
    .back { color: var(--text-secondary); text-decoration: none; align-self: center; margin-right: auto; }
    button { padding: var(--space-2) var(--space-4); border: 1px solid var(--border-default); background: var(--surface-base); color: var(--text-primary); border-radius: var(--radius-md); cursor: pointer; font: inherit; }
    button.danger { background: var(--state-error-fg); color: var(--state-error-bg); border-color: transparent; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class AbsenceDetailPage {
  // bound from router :id segment via withComponentInputBinding()
  readonly id = input.required<string>();

  private readonly api = inject(AbsencesApi);
  private readonly approvalsApi = inject(ApprovalsApi);
  private readonly session = inject(AuthSession);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly absence = signal<Absence | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly overriding = signal(false);

  constructor() {
    queueMicrotask(() => this.refresh());
  }

  private refresh(): void {
    const id = this.id();
    this.loading.set(true);
    this.api.get(id).subscribe({
      next: (a) => { this.absence.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected typeLabel = (a: Absence): string => ABSENCE_LABEL[a.type]?.sk ?? a.type;
  protected stateOf = (a: Absence): string => stateLabel[a.state];
  protected tone = (a: Absence): string => stateTone[a.state];
  protected format = (iso: string): string => new Date(iso).toLocaleString();

  protected showWithdraw = computed((): boolean => {
    const a = this.absence(); if (!a) return false;
    return a.state === 'pending' && a.user_id === this.session.current()?.id;
  });

  protected showCancel = computed((): boolean => {
    const a = this.absence(); if (!a) return false;
    return a.state === 'approved' && a.user_id === this.session.current()?.id &&
      a.date_from > new Date().toISOString().slice(0, 10);
  });

  protected showHrOverride = computed((): boolean => {
    const a = this.absence(); if (!a) return false;
    const u = this.session.current();
    if (!u || !hasRole(u, 'hr')) return false;
    return a.state === 'approved' || a.state === 'pending';
  });

  protected withdraw(a: Absence): void {
    this.busy.set(true);
    this.api.withdraw(a.id).subscribe({
      next: (updated) => { this.busy.set(false); this.absence.set(updated); this.toasts.success('Withdrawn'); },
      error: (e: unknown) => { this.busy.set(false); this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not withdraw'); },
    });
  }

  protected cancel(a: Absence): void {
    if (!confirm('Cancel this approved absence? Your quota will be refunded.')) return;
    this.busy.set(true);
    this.api.cancel(a.id).subscribe({
      next: (updated) => { this.busy.set(false); this.absence.set(updated); this.toasts.success('Cancelled'); },
      error: (e: unknown) => { this.busy.set(false); this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not cancel'); },
    });
  }

  protected askOverride(): void { this.overriding.set(true); }

  protected override(reason: string): void {
    const a = this.absence(); if (!a) return;
    this.overriding.set(false);
    this.busy.set(true); this.error.set(null);
    // HR uses the reject endpoint as the override mechanism (mock server treats
    // HR scope as authoritative). Real BE would expose a dedicated HR-Override
    // endpoint that's logged with kind='HR-Override' in the audit log.
    this.approvalsApi.reject(a.id, `[HR override] ${reason}`).subscribe({
      next: (updated) => { this.busy.set(false); this.absence.set(updated); this.toasts.success('Override applied'); },
      error: (e: unknown) => {
        this.busy.set(false);
        if (e instanceof ApiError) this.error.set(e);
        else this.toasts.error('Override failed');
      },
    });
  }
}
