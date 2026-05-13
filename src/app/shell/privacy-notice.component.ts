import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { AuthSession } from '../../features/auth/domain/auth-session';

// FE refinement §38 — non-dismissable first-login GDPR notice.
// Consent recorded in localStorage with a version hash for re-prompt on update.
const STORAGE_KEY = 'attendance.privacy.consent';
const NOTICE_VERSION = '2026-05-13.v1';

@Component({
  selector: 'app-privacy-notice',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <dialog #dlg aria-labelledby="privacy-h" aria-describedby="privacy-body">
        <div class="card">
          <h2 id="privacy-h">Privacy notice</h2>
          <div id="privacy-body">
            <p>
              The Attendance Portal processes personal data about your worktime, absences and
              documents to administer your employment. By continuing you confirm you have read
              and accept this notice.
            </p>
            <ul>
              <li><strong>What we store:</strong> worktime, absences, documents, audit log entries.</li>
              <li><strong>How long:</strong> per Slovak labour law retention rules (Admin-configurable).</li>
              <li><strong>Who can see what:</strong> employee → own; manager → team; HR → all; admin → metadata.</li>
              <li><strong>Your rights:</strong> access, rectification, erasure (subject to legal retention).</li>
              <li><strong>Cookies / trackers:</strong> none; only browser session storage is used.</li>
            </ul>
          </div>
          <div class="actions">
            <button type="button" (click)="accept()" autofocus>I accept and continue</button>
          </div>
        </div>
      </dialog>
    }
  `,
  styles: [`
    dialog { padding: 0; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--surface-base); color: var(--text-primary); max-width: min(640px, 92vw); }
    dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
    .card { padding: var(--space-6); }
    h2 { margin: 0 0 var(--space-3) 0; font-size: var(--font-size-heading-md); }
    p { margin: 0 0 var(--space-3) 0; }
    ul { padding-left: var(--space-6); }
    .actions { display: flex; justify-content: flex-end; margin-top: var(--space-4); }
    button { padding: var(--space-2) var(--space-4); background: var(--accent-primary); color: var(--text-inverse); border: 0; border-radius: var(--radius-md); cursor: pointer; font: inherit; }
  `],
})
export class PrivacyNoticeComponent {
  @ViewChild('dlg') private dlgRef?: ElementRef<HTMLDialogElement>;

  private readonly session = inject(AuthSession);
  protected readonly visible = signal(false);

  constructor() {
    effect(() => {
      const user = this.session.user();
      if (!user) { this.visible.set(false); return; }
      const accepted = localStorage.getItem(STORAGE_KEY);
      const needsConsent = accepted !== NOTICE_VERSION;
      this.visible.set(needsConsent);
      queueMicrotask(() => {
        if (needsConsent && this.dlgRef && !this.dlgRef.nativeElement.open) {
          this.dlgRef.nativeElement.showModal();
        }
      });
    });
  }

  protected accept(): void {
    localStorage.setItem(STORAGE_KEY, NOTICE_VERSION);
    this.dlgRef?.nativeElement.close();
    this.visible.set(false);
  }
}
