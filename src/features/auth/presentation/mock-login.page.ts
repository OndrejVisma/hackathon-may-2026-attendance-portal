import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from '../infrastructure/auth-api';
import { ApiError } from '../../../shared/http/http-error';
import { ErrorBannerComponent } from '../../../shared/ui/error-banner.component';

// Mock-login per FE refinement §8 Basic — pick a seeded user, no password.
// The mock-server seeds these users; emails here MUST match the seed fixture.

const SEEDED = [
  { email: 'anna@example.local',       label: 'Anna Novakova',     hint: 'Employee · team Platform' },
  { email: 'peter@example.local',      label: 'Peter Kovac',       hint: 'Employee · team Platform' },
  { email: 'leadA1@example.local',     label: 'Lead A1',           hint: 'Manager + Employee' },
  { email: 'deptHeadA@example.local',  label: 'DeptHead A',        hint: 'Manager (skip-level)' },
  { email: 'ceo@example.local',        label: 'CEO',               hint: 'No direct manager' },
  { email: 'hr1@example.local',        label: 'HR One',            hint: 'HR' },
  { email: 'admin1@example.local',     label: 'Admin One',         hint: 'Admin' },
];

@Component({
  selector: 'app-mock-login',
  standalone: true,
  imports: [ErrorBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main aria-labelledby="mock-login-heading">
      <h1 id="mock-login-heading">Mock login</h1>
      <p>Pick a seeded user. No password — Basic tier per spec §8.</p>
      <app-error-banner [error]="error()" />
      <ul role="list">
        @for (u of users; track u.email) {
          <li>
            <button type="button" [disabled]="loading() === u.email" (click)="signIn(u.email)">
              <span class="who">{{ u.label }}</span>
              <span class="hint">{{ u.hint }}</span>
              @if (loading() === u.email) { <span class="spinner">…</span> }
            </button>
          </li>
        }
      </ul>
    </main>
  `,
  styles: [`
    main { max-width: 480px; padding: var(--space-6); margin: var(--space-12) auto; }
    h1 { font-size: var(--font-size-heading-lg); margin-bottom: var(--space-2); }
    p { color: var(--text-secondary); margin-bottom: var(--space-6); }
    ul { list-style: none; padding: 0; display: grid; gap: var(--space-2); }
    button {
      width: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-1);
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--surface-raised);
      color: var(--text-primary);
      text-align: left; cursor: pointer; font: inherit;
    }
    button:hover { background: var(--surface-sunken); }
    button:disabled { opacity: 0.5; cursor: progress; }
    .who { font-weight: var(--font-weight-strong); }
    .hint { color: var(--text-secondary); font-size: var(--font-size-caption); }
  `],
})
export class MockLoginPage {
  private readonly auth = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly users = SEEDED;
  protected readonly loading = signal<string | null>(null);
  protected readonly error = signal<ApiError | null>(null);

  protected signIn(email: string): void {
    this.loading.set(email);
    this.error.set(null);
    this.auth.signInMock(email).subscribe({
      next: () => { this.loading.set(null); void this.router.navigate(['/']); },
      error: (e: unknown) => {
        this.loading.set(null);
        this.error.set(e instanceof ApiError ? e : null);
      },
    });
  }
}
