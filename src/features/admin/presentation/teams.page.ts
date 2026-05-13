import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../infrastructure/admin-api';
import type { components } from '../../../shared/http/generated/api-schema';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';

type Team = components['schemas']['Team'];

@Component({
  selector: 'app-admin-teams',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Create team</h3>
    <form [formGroup]="form" (ngSubmit)="create()" class="form">
      <label>Name <input type="text" formControlName="name" required /></label>
      <label>Members (comma-separated user IDs) <input type="text" formControlName="members" /></label>
      <button type="submit" [disabled]="!form.valid">Create</button>
    </form>

    <h3>Teams</h3>
    @if (loading()) {
      <app-loading-skeleton [count]="3" />
    } @else {
      <ul role="list" class="rows">
        @for (t of teams(); track t.id) {
          <li>
            <strong>{{ t.name }}</strong>
            <span class="count">{{ (t.member_ids ?? []).length }} members</span>
          </li>
        }
      </ul>
    }
  `,
  styles: [`
    h3 { margin: var(--space-4) 0 var(--space-2) 0; font-size: var(--font-size-heading-sm); }
    .form { display: flex; gap: var(--space-3); align-items: end; flex-wrap: wrap; margin-bottom: var(--space-3); }
    label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    input { padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--surface-base); color: var(--text-primary); font: inherit; }
    button { padding: var(--space-2) var(--space-4); background: var(--accent-primary); color: var(--text-inverse); border: 0; border-radius: var(--radius-md); cursor: pointer; font: inherit; &:disabled { opacity: 0.5; } }
    .rows { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-2); }
    li { padding: var(--space-3); background: var(--surface-raised); border-radius: var(--radius-md); display: flex; gap: var(--space-3); align-items: center; }
    .count { color: var(--text-muted); font-size: var(--font-size-caption); }
  `],
})
export class AdminTeamsPage {
  private readonly api = inject(AdminApi);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);

  protected readonly teams = signal<readonly Team[]>([]);
  protected readonly loading = signal(true);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    members: [''],
  });

  constructor() { this.refresh(); }

  protected create(): void {
    if (!this.form.valid) return;
    const v = this.form.getRawValue();
    const members = v.members.split(',').map((s) => s.trim()).filter(Boolean);
    this.api.createTeam({
      name: v.name,
      ...(members.length > 0 ? { member_ids: members } : {}),
    }).subscribe({
      next: (t) => {
        this.toasts.success(`Team "${t.name}" created`);
        this.teams.update((cur) => [t, ...cur]);
        this.form.reset({ name: '', members: '' });
      },
      error: (e: unknown) => this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not create'),
    });
  }

  private refresh(): void {
    this.api.listTeams().subscribe({
      next: (ts) => { this.teams.set(ts); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
