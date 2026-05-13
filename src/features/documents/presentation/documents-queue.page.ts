import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DocumentsApi } from '../infrastructure/documents-api';
import { Document } from '../domain/document';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { DocumentDecisionDialogComponent } from './document-decision-dialog.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';
import { API_CONFIG } from '../../../shared/http/api-config';
import { AuthSession } from '../../auth/domain/auth-session';

@Component({
  selector: 'app-documents-queue',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent, LoadingSkeletonComponent, DocumentDecisionDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Documents queue" subtitle="Pending paragraph / OCR / special-leave attachments." />

    @if (loading()) {
      <app-loading-skeleton [count]="3" />
    } @else if (items().length === 0) {
      <app-empty-state title="All documents validated" description="There are no pending documents in the HR queue." />
    } @else {
      <ul role="list" class="rows">
        @for (d of items(); track d.id) {
          <li>
            <div class="meta">
              <strong>{{ d.filename ?? '(unnamed file)' }}</strong>
              <span>{{ d.mime_type }} · {{ formatSize(d.size_bytes) }}</span>
              <span class="absence">absence #{{ d.absence_id }}</span>
            </div>
            <div class="preview">
              @if (isImage(d)) {
                <img [src]="downloadUrl(d)" alt="" />
              } @else {
                <iframe [src]="previewUrlSafe(d)" sandbox="allow-same-origin" title="Document preview"></iframe>
              }
            </div>
            <div class="actions">
              <button type="button" class="primary" (click)="ask(d, 'approve')" [disabled]="busy() === d.id">Validate</button>
              <button type="button" class="danger" (click)="ask(d, 'reject')"  [disabled]="busy() === d.id">Reject…</button>
            </div>
          </li>
        }
      </ul>
    }

    @if (asking()) {
      <app-document-decision-dialog
        [mode]="askingMode()"
        (confirmed)="decide($event)"
        (cancelled)="asking.set(null)" />
    }
  `,
  styles: [`
    .rows { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-3); }
    li { padding: var(--space-4); background: var(--surface-raised); border-radius: var(--radius-md); display: grid; gap: var(--space-3); grid-template-columns: 1fr 240px; grid-template-areas: 'meta preview' 'actions preview'; }
    .meta { grid-area: meta; display: flex; flex-direction: column; gap: var(--space-1); }
    .meta span { color: var(--text-secondary); font-size: var(--font-size-caption); }
    .meta .absence { color: var(--text-muted); }
    .preview { grid-area: preview; height: 180px; background: var(--surface-sunken); border-radius: var(--radius-sm); overflow: hidden; }
    .preview img, .preview iframe { width: 100%; height: 100%; object-fit: contain; border: 0; }
    .actions { grid-area: actions; display: flex; gap: var(--space-2); align-items: end; }
    .actions button { padding: var(--space-2) var(--space-4); border: 0; border-radius: var(--radius-md); cursor: pointer; font: inherit; }
    .actions .primary { background: var(--state-success-fg); color: var(--state-success-bg); }
    .actions .danger  { background: var(--state-error-fg);   color: var(--state-error-bg); }
    @media (max-width: 767px) {
      li { grid-template-columns: 1fr; grid-template-areas: 'meta' 'preview' 'actions'; }
    }
  `],
})
export class DocumentsQueuePage {
  private readonly api = inject(DocumentsApi);
  private readonly toasts = inject(ToastService);
  private readonly config = inject(API_CONFIG);
  private readonly session = inject(AuthSession);

  protected readonly items = signal<readonly Document[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal<string | null>(null);
  protected readonly asking = signal<{ doc: Document; mode: 'approve' | 'reject' } | null>(null);

  constructor() {
    this.refresh();
  }

  protected askingMode(): 'approve' | 'reject' { return this.asking()?.mode ?? 'reject'; }

  protected isImage = (d: Document): boolean => d.mime_type.startsWith('image/');

  protected formatSize(b: number): string {
    return b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
  }

  protected downloadUrl = (d: Document): string =>
    `${this.config.baseUrl}/documents/${d.id}/content?token=${this.session.accessToken() ?? ''}`;

  protected previewUrlSafe = (d: Document): string => this.downloadUrl(d);

  protected ask(doc: Document, mode: 'approve' | 'reject'): void {
    this.asking.set({ doc, mode });
  }

  protected decide(payload: { decision: 'approve' | 'reject'; reason?: string }): void {
    const a = this.asking();
    if (!a) return;
    this.asking.set(null);
    this.busy.set(a.doc.id);
    this.api.validate(a.doc.id, payload.decision, payload.reason).subscribe({
      next: () => {
        this.busy.set(null);
        this.toasts.success(payload.decision === 'approve' ? 'Document validated' : 'Document rejected');
        this.items.update((cur) => cur.filter((x) => x.id !== a.doc.id));
      },
      error: (e: unknown) => {
        this.busy.set(null);
        this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not decide');
      },
    });
  }

  private refresh(): void {
    this.api.pending().subscribe({
      next: (rows) => { this.items.set(rows); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
