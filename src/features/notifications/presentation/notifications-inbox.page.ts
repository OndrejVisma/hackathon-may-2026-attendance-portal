import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NotificationsApi } from '../infrastructure/notifications-api';
import { Notification, KIND_LABEL } from '../domain/notification';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';

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
  protected readonly items = signal<readonly Notification[]>([]);
  protected readonly loading = signal(true);

  constructor() {
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
