import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../infrastructure/admin-api';
import type { components } from '../../../shared/http/generated/api-schema';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';
import { ErrorBannerComponent } from '../../../shared/ui/error-banner.component';

type User = components['schemas']['User'];
type Role = components['schemas']['Role'];
const ROLES: readonly Role[] = ['employee', 'manager', 'hr', 'admin'];

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSkeletonComponent, ErrorBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Invite user</h3>
    <form [formGroup]="form" (ngSubmit)="invite()" class="invite">
      <label>Email     <input type="email" formControlName="email" required /></label>
      <label>First     <input type="text"  formControlName="first_name" required /></label>
      <label>Last      <input type="text"  formControlName="last_name" required /></label>
      <fieldset>
        <legend>Roles</legend>
        @for (r of roles; track r) {
          <label class="role">
            <input type="checkbox" [value]="r" (change)="toggleRole(r, $event)" />
            {{ r }}
          </label>
        }
      </fieldset>
      <label>Team    <input type="text" formControlName="team_id" placeholder="optional" /></label>
      <label>Manager <input type="text" formControlName="direct_manager_id" placeholder="optional" /></label>
      <button type="submit" [disabled]="!form.valid || saving()">{{ saving() ? 'Saving…' : 'Invite' }}</button>
    </form>
    <app-error-banner [error]="error()" />

    <h3>Users</h3>
    @if (loading()) {
      <app-loading-skeleton [count]="5" />
    } @else {
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Roles</th><th>Active</th><th></th></tr></thead>
        <tbody>
          @for (u of users(); track u.id) {
            <tr [class.inactive]="!u.active">
              <td>{{ u.first_name }} {{ u.last_name }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.roles.join(', ') }}</td>
              <td>{{ u.active ? 'yes' : 'no' }}</td>
              <td>@if (u.active) { <button type="button" (click)="deactivate(u)">Revoke</button> }</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    h3 { margin: var(--space-4) 0 var(--space-2) 0; font-size: var(--font-size-heading-sm); }
    .invite { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); align-items: end; margin-bottom: var(--space-3); }
    .invite fieldset { border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: var(--space-2); }
    .invite legend { font-size: var(--font-size-caption); }
    .invite .role { display: flex; align-items: center; gap: var(--space-2); flex-direction: row; }
    label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    input { padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--surface-base); color: var(--text-primary); font: inherit; }
    button { padding: var(--space-2) var(--space-4); background: var(--accent-primary); color: var(--text-inverse); border: 0; border-radius: var(--radius-md); cursor: pointer; font: inherit; &:disabled { opacity: 0.5; cursor: not-allowed; } }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: var(--space-2); text-align: left; border-bottom: 1px solid var(--border-default); }
    tr.inactive { opacity: 0.5; }
  `],
})
export class AdminUsersPage {
  private readonly api = inject(AdminApi);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);

  protected readonly roles = ROLES;
  protected readonly users = signal<readonly User[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<ApiError | null>(null);

  private readonly pickedRoles = signal<readonly Role[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    team_id: [''],
    direct_manager_id: [''],
  });

  constructor() {
    this.refresh();
  }

  protected toggleRole(r: Role, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this.pickedRoles.update((cur) => checked ? [...cur, r] : cur.filter((x) => x !== r));
  }

  protected invite(): void {
    if (!this.form.valid) return;
    const v = this.form.getRawValue();
    const roles = this.pickedRoles();
    if (roles.length === 0) {
      this.toasts.warn('Pick at least one role.');
      return;
    }
    this.saving.set(true); this.error.set(null);
    this.api.createUser({
      email: v.email,
      first_name: v.first_name,
      last_name: v.last_name,
      roles: roles as Role[],
      ...(v.team_id ? { team_id: v.team_id } : {}),
      ...(v.direct_manager_id ? { direct_manager_id: v.direct_manager_id } : {}),
    }).subscribe({
      next: (u) => {
        this.saving.set(false);
        this.toasts.success(`Invited ${u.email}`);
        this.users.update((cur) => [u, ...cur]);
        this.form.reset({ email: '', first_name: '', last_name: '', team_id: '', direct_manager_id: '' });
        this.pickedRoles.set([]);
      },
      error: (e: unknown) => {
        this.saving.set(false);
        this.error.set(e instanceof ApiError ? e : null);
      },
    });
  }

  protected deactivate(u: User): void {
    if (!confirm(`Revoke access for ${u.email}? Account is preserved.`)) return;
    this.api.deactivateUser(u.id).subscribe({
      next: () => {
        this.toasts.success('Access revoked');
        this.users.update((cur) => cur.map((x) => x.id === u.id ? { ...x, active: false } : x));
      },
      error: (e: unknown) => this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not revoke'),
    });
  }

  private refresh(): void {
    this.api.listUsers().subscribe({
      next: (us) => { this.users.set(us); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
