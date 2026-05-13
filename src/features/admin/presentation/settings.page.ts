import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import { ApiError } from '../../../shared/http/http-error';
import { ToastService } from '../../../shared/ui/toast.service';

// Admin-level platform settings.
// Right now: email-channel master switch. When off, the BE skips SMTP for
// every notification kind (vacation submitted, sickday, document validated,
// etc.) regardless of per-user prefs. When on, per-user prefs decide.
// Endpoint /admin/settings is stub — real BE adds it. 404 is tolerated.

interface PlatformSettings {
  readonly email_channel_enabled: boolean;
  readonly telemetry_endpoint?: string;
  readonly maintenance_banner?: string;
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Platform settings</h3>
    <p class="hint">
      Master switches that affect every user. Per-user notification preferences
      in <a href="/profile">profile</a> only apply when the channel is enabled here.
    </p>

    <label class="toggle">
      <input
        type="checkbox"
        [checked]="settings().email_channel_enabled"
        (change)="toggleEmail($event)"
        [disabled]="saving()" />
      <span>
        <strong>Email channel</strong>
        <small>SMTP mirror of in-portal notifications (spec §10 / &#64;email-channel)</small>
      </span>
    </label>

    <h3>Maintenance banner</h3>
    <p class="hint">Optional message shown to all users in the topbar.</p>
    <label class="full">
      Banner text
      <input
        type="text"
        [value]="settings().maintenance_banner ?? ''"
        (change)="setBanner($event)"
        [disabled]="saving()"
        placeholder="e.g. Scheduled maintenance Saturday 02:00–04:00." />
    </label>
  `,
  styles: [`
    h3 { margin: var(--space-4) 0 var(--space-2) 0; font-size: var(--font-size-heading-sm); }
    .hint { color: var(--text-secondary); margin: 0 0 var(--space-3) 0; }
    .toggle { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-3); background: var(--surface-raised); border-radius: var(--radius-md); cursor: pointer; }
    .toggle input { margin-top: 4px; }
    .toggle strong { display: block; }
    .toggle small { color: var(--text-secondary); }
    label.full { display: flex; flex-direction: column; gap: var(--space-2); max-width: 480px; }
    input[type='text'] { padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--surface-base); color: var(--text-primary); font: inherit; }
  `],
})
export class AdminSettingsPage {
  private readonly api = inject(ApiClient);
  private readonly toasts = inject(ToastService);

  protected readonly settings = signal<PlatformSettings>({ email_channel_enabled: true });
  protected readonly saving = signal(false);

  constructor() {
    this.api.get<PlatformSettings>('/admin/settings').pipe(
      catchError(() => of(null)),
    ).subscribe((s) => { if (s) this.settings.set(s); });
  }

  protected toggleEmail(ev: Event): void {
    const enabled = (ev.target as HTMLInputElement).checked;
    this.patch({ email_channel_enabled: enabled });
  }

  protected setBanner(ev: Event): void {
    const text = (ev.target as HTMLInputElement).value;
    this.patch({ maintenance_banner: text });
  }

  private patch(body: Partial<PlatformSettings>): void {
    this.saving.set(true);
    this.api.patch<PlatformSettings>('/admin/settings', body).pipe(
      catchError((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) {
          // Stub endpoint absent — apply locally so the UI behaves coherently.
          return of({ ...this.settings(), ...body } satisfies PlatformSettings);
        }
        this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not save');
        return of(null);
      }),
    ).subscribe((res) => {
      this.saving.set(false);
      if (res) {
        this.settings.set(res);
        this.toasts.success('Saved');
      }
    });
  }
}
