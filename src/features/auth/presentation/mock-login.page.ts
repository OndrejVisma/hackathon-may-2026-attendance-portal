import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from '../infrastructure/auth-api';
import { OidcAuthService } from '../infrastructure/oidc-auth.service';
import { OIDC_CONFIG } from '../infrastructure/oidc-config';
import { ApiError } from '../../../shared/http/http-error';
import { ErrorBannerComponent } from '../../../shared/ui/error-banner.component';

// Seeded user IDs match the hackathon mock server fixture
// (dev-extras/integration/mock-server/src/store/seed.ts).
const SEEDED = [
  { id: 'u-ic-anna',       label: 'Anna Mrkvička',     hint: 'Employee · team Platform' },
  { id: 'u-ic-peter',      label: 'Peter Ušatý',       hint: 'Employee · team Platform' },
  { id: 'u-lead-platform', label: 'Peter Kováč',       hint: 'Manager · team Platform' },
  { id: 'u-head-platform', label: 'Tomáš Horváth',     hint: 'Department head (skip-level)' },
  { id: 'u-ceo',           label: 'Eva Krajčíková',    hint: 'CEO · no direct manager' },
  { id: 'u-hr',            label: 'Lucia Tichá',       hint: 'HR' },
  { id: 'u-admin',         label: 'Karol Veľký',       hint: 'Admin' },
];

@Component({
  selector: 'app-mock-login',
  standalone: true,
  imports: [ErrorBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main aria-labelledby="mock-login-heading">
      <h1 id="mock-login-heading">Sign in</h1>

      @if (oidcEnabled) {
        <section aria-labelledby="oidc-h" class="oidc">
          <h2 id="oidc-h">Single sign-on (OIDC)</h2>
          <button type="button" class="primary" (click)="signInOidc()">
            Continue with your work account
          </button>
        </section>
        <hr aria-hidden="true" />
      }

      <section aria-labelledby="mock-h">
        <h2 id="mock-h">Mock login</h2>
        <p>Pick a seeded user. No password — Basic tier per spec §8.</p>
        <app-error-banner [error]="error()" />
        <ul role="list">
          @for (u of users; track u.id) {
            <li>
              <button type="button" [disabled]="loading() === u.id" (click)="signIn(u.id)">
                <span class="who">{{ u.label }}</span>
                <span class="hint">{{ u.hint }}</span>
                @if (loading() === u.id) { <span class="spinner">…</span> }
              </button>
            </li>
          }
        </ul>
      </section>
    </main>
  `,
  styles: [`
    main { max-width: 480px; padding: var(--space-6); margin: var(--space-12) auto; }
    h1 { font-size: var(--font-size-heading-lg); margin-bottom: var(--space-4); }
    h2 { font-size: var(--font-size-heading-sm); margin: 0 0 var(--space-2) 0; color: var(--text-secondary); }
    p  { color: var(--text-secondary); margin-bottom: var(--space-4); }
    hr { border: 0; border-top: 1px solid var(--border-default); margin: var(--space-6) 0; }
    ul { list-style: none; padding: 0; display: grid; gap: var(--space-2); margin: 0; }
    .oidc { margin-bottom: var(--space-2); }
    button {
      width: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-1);
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--surface-raised);
      color: var(--text-primary);
      text-align: left; cursor: pointer; font: inherit;
    }
    button.primary {
      background: var(--accent-primary); color: var(--text-inverse);
      border-color: transparent; text-align: center; align-items: center;
    }
    button:hover { background: var(--surface-sunken); }
    button.primary:hover { background: var(--accent-primary); filter: brightness(1.05); }
    button:disabled { opacity: 0.5; cursor: progress; }
    .who { font-weight: var(--font-weight-strong); }
    .hint { color: var(--text-secondary); font-size: var(--font-size-caption); }
  `],
})
export class MockLoginPage {
  private readonly auth = inject(AuthApi);
  private readonly oidc = inject(OidcAuthService);
  private readonly cfg = inject(OIDC_CONFIG);
  private readonly router = inject(Router);

  protected readonly users = SEEDED;
  protected readonly loading = signal<string | null>(null);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly oidcEnabled = this.cfg.enabled;

  protected signIn(userId: string): void {
    this.loading.set(userId);
    this.error.set(null);
    this.auth.signInMock(userId).subscribe({
      next: () => { this.loading.set(null); void this.router.navigate(['/']); },
      error: (e: unknown) => {
        this.loading.set(null);
        this.error.set(e instanceof ApiError ? e : null);
      },
    });
  }

  protected signInOidc(): void {
    this.oidc.startLogin();
  }
}
