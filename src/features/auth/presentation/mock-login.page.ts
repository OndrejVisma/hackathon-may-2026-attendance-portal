import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSession } from '../domain/auth-session';
import { User } from '../domain/user';

// Mock-login per FE refinement §8 Basic — pick a seeded user, no password.
// Real OIDC is Bonus, replaces this page entirely.

const SEEDED_USERS: readonly User[] = [
  { id: 'anna',       firstName: 'Anna',     lastName: 'Novakova', roles: ['EMPLOYEE'],            teamId: 'platform', directManagerId: 'leadA1',    language: 'sk' },
  { id: 'peter',      firstName: 'Peter',    lastName: 'Kovac',    roles: ['EMPLOYEE'],            teamId: 'platform', directManagerId: 'leadA1',    language: 'sk' },
  { id: 'leadA1',     firstName: 'Lead',     lastName: 'A1',       roles: ['MANAGER','EMPLOYEE'],  teamId: 'platform', directManagerId: 'deptHeadA', language: 'sk' },
  { id: 'deptHeadA',  firstName: 'DeptHead', lastName: 'A',        roles: ['MANAGER','EMPLOYEE'],  teamId: 'platform', directManagerId: 'ceo',       language: 'sk' },
  { id: 'ceo',        firstName: 'C',        lastName: 'EO',       roles: ['MANAGER','EMPLOYEE'],  teamId: 'leadership', directManagerId: null,      language: 'sk' },
  { id: 'hr1',        firstName: 'HR',       lastName: 'One',      roles: ['HR','EMPLOYEE'],       teamId: 'hr',       directManagerId: 'ceo',       language: 'sk' },
  { id: 'admin1',     firstName: 'Admin',    lastName: 'One',      roles: ['ADMIN','EMPLOYEE'],    teamId: 'it',       directManagerId: 'ceo',       language: 'sk' },
];

@Component({
  selector: 'app-mock-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main aria-labelledby="mock-login-heading">
      <h1 id="mock-login-heading">Mock login</h1>
      <p>Pick a seeded user. No password — Basic tier per spec §8.</p>
      <ul role="list">
        @for (u of users; track u.id) {
          <li>
            <button type="button" (click)="signIn(u)">
              {{ u.firstName }} {{ u.lastName }} — {{ u.roles.join(', ') }}
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
      width: 100%;
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--surface-raised);
      color: var(--text-primary);
      text-align: left;
      cursor: pointer;
      font: inherit;
    }
    button:hover { background: var(--surface-sunken); }
  `],
})
export class MockLoginPage {
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly users = signal<readonly User[]>(SEEDED_USERS).asReadonly()();

  protected signIn(user: User): void {
    this.session.signIn(user);
    void this.router.navigate(['/']);
  }
}
