import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { NotificationsApi } from '../infrastructure/notifications-api';
import { Notification, KIND_LABEL } from '../domain/notification';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { SseService } from '../../../shared/realtime/sse.service';

@Component({
  selector: 'app-notifications-inbox',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, LoadingSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Notifications" subtitle="Mirrors every notification sent to you." />

    @if (loading()) {
      <app-loading-skeleton [count]="5" />
    } @else if (items().length === 0) {
      <app-empty-state title="No notifications" description="When approvals, decisions or documents land, they'll appear here." />
    } @else {
      <ul role="list" class="rows">
        @for (n of items(); track n.id) {
          <li [attr.data-unread]="!n.read" (click)="open(n)">
            <span class="kind">{{ kind(n) }}</span>
            <span class="subject">{{ n.subject }}</span>
            <time [attr.datetime]="n.created_at">{{ format(n.created_at) }}</time>
          </li>
        }
      </ul>
    }
  `,
  styles: [`
    .rows { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-2); }
    li {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3); background: var(--surface-raised); border-radius: var(--radius-md);
      cursor: pointer;
      &[data-unread='true'] { border-left: 3px solid var(--accent-primary); background: var(--state-info-bg); }
    }
    .kind { min-width: 160px; color: var(--text-secondary); font-size: var(--font-size-caption); }
    .subject { flex: 1; }
    time { color: var(--text-muted); font-size: var(--font-size-caption); font-variant-numeric: tabular-nums; }
  `],
})
export class NotificationsInboxPage {
  private readonly api = inject(NotificationsApi);
  private readonly sse = inject(SseService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly items = signal<readonly Notification[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.refresh();
    // SSE: a fresh notification refetches the list so it's visible <1s.
    this.sse.stream().pipe(
      filter((e) => e.kind === 'notification' || e.kind.startsWith('absence.') || e.kind.startsWith('document.')),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.refresh());
  }

  private refresh(): void {
    this.api.list().subscribe({
      next: (res) => { this.items.set(res.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected kind = (n: Notification): string => KIND_LABEL[n.event_kind] ?? n.event_kind;
  protected format = (iso: string): string => new Date(iso).toLocaleString();

  protected open(n: Notification): void {
    if (!n.read) {
      this.api.markRead(n.id).subscribe({
        next: () => this.items.update((cur) => cur.map((x) => x.id === n.id ? { ...x, read: true } : x)),
        error: () => {/* tolerate */},
      });
    }
  }
}
