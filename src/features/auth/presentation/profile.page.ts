import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { AuthSession, fullName } from '..';
import { MeApi, UserPreferences } from '../infrastructure/me-api';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';
import { ThemeService } from '../../../app/shell/theme.service';
import { DensityService } from '../../../app/shell/density.service';
import { I18nService } from '../../../shared/i18n/i18n.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Profile" subtitle="Account info + how you receive notifications." />

    @if (session.user(); as u) {
      <section aria-labelledby="ident-h" class="card">
        <h2 id="ident-h">Identity</h2>
        <dl>
          <dt>Name</dt>     <dd>{{ fullNameOf(u) }}</dd>
          <dt>Email</dt>    <dd>{{ u.email }}</dd>
          <dt>Roles</dt>    <dd>{{ u.roles.join(', ') }}</dd>
          <dt>Team</dt>     <dd>{{ u.team_id ?? '—' }}</dd>
          <dt>Manager</dt>  <dd>{{ u.direct_manager_id ?? '—' }}</dd>
        </dl>
      </section>
    }

    <section aria-labelledby="prefs-h" class="card">
      <h2 id="prefs-h">Preferences</h2>
      <div class="row">
        <label>
          Theme
          <select [value]="theme.preference()" (change)="setTheme($event)">
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Language
          <select [value]="i18n.locale()" (change)="setLocale($event)">
            <option value="sk">Slovenčina</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          Density
          <select [value]="density.density()" (change)="setDensity($event)">
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
      </div>
    </section>

    <section aria-labelledby="channels-h" class="card">
      <h2 id="channels-h">Notification channels</h2>
      <p class="hint">
        In-portal notifications always arrive on
        <a href="/notifications">your inbox</a>.
        Email mirror is sent only when this is on (per spec §10 / &#64;email-channel).
      </p>
      <label class="toggle">
        <input
          type="checkbox"
          [checked]="prefs().email_enabled"
          (change)="toggleEmail($event)" />
        <span>Send email mirror to {{ session.user()?.email }}</span>
      </label>
      <label class="toggle">
        <input
          type="checkbox"
          [checked]="prefs().telemetry_enabled"
          (change)="toggleTelemetry($event)" />
        <span>Send anonymous error reports (helps fix bugs)</span>
      </label>
    </section>

    <section aria-labelledby="privacy-h" class="card">
      <h2 id="privacy-h">Privacy &amp; data</h2>
      <p class="hint">
        Slovak labour law sets attendance-record retention. Deletion is HR-mediated.
      </p>
      <div class="actions">
        <button type="button" (click)="downloadExport()" [disabled]="downloading()">
          {{ downloading() ? 'Preparing…' : 'Download my data (JSON)' }}
        </button>
        <button type="button" class="danger" (click)="requestDeletion()" [disabled]="requestingDeletion()">
          {{ requestingDeletion() ? 'Requesting…' : 'Request account deletion' }}
        </button>
        <button type="button" (click)="resetTour()">Replay onboarding tour</button>
      </div>
    </section>
  `,
  styles: [`
    .card { padding: var(--space-4); background: var(--surface-raised); border-radius: var(--radius-md); margin-bottom: var(--space-4); }
    h2 { margin: 0 0 var(--space-3) 0; font-size: var(--font-size-heading-sm); }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: var(--space-1) var(--space-4); margin: 0; }
    dt { color: var(--text-secondary); font-size: var(--font-size-caption); }
    dd { margin: 0; }
    .row { display: flex; gap: var(--space-3); flex-wrap: wrap; }
    label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    label.toggle { flex-direction: row; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); color: var(--text-primary); font-size: var(--font-size-body); }
    select { padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--surface-base); color: var(--text-primary); font: inherit; }
    .hint { color: var(--text-secondary); margin: 0 0 var(--space-3) 0; }
    .actions { display: flex; gap: var(--space-3); flex-wrap: wrap; }
    button { padding: var(--space-2) var(--space-4); background: var(--surface-base); color: var(--text-primary); border: 1px solid var(--border-default); border-radius: var(--radius-md); cursor: pointer; font: inherit; &:disabled { opacity: 0.5; cursor: not-allowed; } }
    button.danger { background: var(--state-error-fg); color: var(--state-error-bg); border-color: transparent; }
    a { color: var(--accent-primary); }
  `],
})
export class ProfilePage {
  protected readonly session = inject(AuthSession);
  protected readonly theme   = inject(ThemeService);
  protected readonly density = inject(DensityService);
  protected readonly i18n    = inject(I18nService);

  private readonly api = inject(MeApi);
  private readonly toasts = inject(ToastService);

  protected fullNameOf = fullName;

  // Default preferences are local until the server confirms otherwise.
  protected readonly prefs = signal<UserPreferences>({
    email_enabled: true,
    telemetry_enabled: true,
    density: 'comfortable',
  });

  protected readonly downloading = signal(false);
  protected readonly requestingDeletion = signal(false);

  constructor() {
    this.api.getPreferences().pipe(
      catchError(() => of(null)),
    ).subscribe((p) => { if (p) this.prefs.set(p); });
  }

  protected setTheme(ev: Event): void {
    const value = (ev.target as HTMLSelectElement).value as 'light' | 'dark' | 'system';
    this.theme.set(value);
  }

  protected setLocale(ev: Event): void {
    const value = (ev.target as HTMLSelectElement).value as 'sk' | 'en';
    this.i18n.set(value);
  }

  protected setDensity(ev: Event): void {
    const value = (ev.target as HTMLSelectElement).value as 'comfortable' | 'compact';
    this.density.set(value);
  }

  protected toggleEmail(ev: Event): void {
    const enabled = (ev.target as HTMLInputElement).checked;
    this.prefs.update((p) => ({ ...p, email_enabled: enabled }));
    this.persist({ email_enabled: enabled });
  }

  protected toggleTelemetry(ev: Event): void {
    const enabled = (ev.target as HTMLInputElement).checked;
    this.prefs.update((p) => ({ ...p, telemetry_enabled: enabled }));
    this.persist({ telemetry_enabled: enabled });
  }

  private persist(patch: Partial<UserPreferences>): void {
    this.api.updatePreferences(patch).pipe(
      catchError((e: unknown) => {
        // Mock server may 404 the preference endpoint; that's OK for local
        // dev, real BE wires this. Don't show a noisy error toast.
        if (e instanceof ApiError && e.status === 404) return of(this.prefs());
        this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not save');
        return of(this.prefs());
      }),
    ).subscribe();
  }

  protected downloadExport(): void {
    this.downloading.set(true);
    this.api.dataExport().subscribe({
      next: (data) => {
        this.downloading.set(false);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.toasts.success('Export downloaded');
      },
      error: (e: unknown) => {
        this.downloading.set(false);
        this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not export');
      },
    });
  }

  protected requestDeletion(): void {
    if (!confirm('Request deletion of your account? HR processes the request within the legal framework. You can cancel before HR acts.')) return;
    this.requestingDeletion.set(true);
    this.api.requestDeletion().subscribe({
      next: () => {
        this.requestingDeletion.set(false);
        this.toasts.success('Deletion request submitted. HR will follow up.');
      },
      error: (e: unknown) => {
        this.requestingDeletion.set(false);
        this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not submit request');
      },
    });
  }

  protected resetTour(): void {
    localStorage.removeItem('attendance.onboarding.completed');
    this.toasts.info('Tour will replay on next sign-in.');
  }
}
