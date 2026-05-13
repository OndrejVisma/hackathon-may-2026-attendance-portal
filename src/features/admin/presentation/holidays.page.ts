import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../infrastructure/admin-api';
import type { components } from '../../../shared/http/generated/api-schema';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';

type Holiday = components['schemas']['Holiday'];

@Component({
  selector: 'app-admin-holidays',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Add holiday</h3>
    <form [formGroup]="form" (ngSubmit)="add()" class="form">
      <label>Date <input type="date" formControlName="date" required /></label>
      <label>Name <input type="text" formControlName="name" required /></label>
      <button type="submit" [disabled]="!form.valid">Add</button>
    </form>

    <h3>Holidays</h3>
    @if (loading()) {
      <app-loading-skeleton [count]="5" />
    } @else {
      <ul role="list" class="rows">
        @for (h of holidays(); track h.date) {
          <li>
            <span class="date">{{ h.date }}</span>
            <span>{{ h.name }}</span>
            <button type="button" (click)="remove(h)">Remove</button>
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
    li { padding: var(--space-2) var(--space-3); background: var(--surface-raised); border-radius: var(--radius-md); display: flex; gap: var(--space-3); align-items: center; }
    .date { font-variant-numeric: tabular-nums; min-width: 110px; color: var(--text-secondary); }
    li button { background: transparent; border: 1px solid var(--border-default); color: var(--text-secondary); margin-left: auto; }
  `],
})
export class AdminHolidaysPage {
  private readonly api = inject(AdminApi);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);

  protected readonly holidays = signal<readonly Holiday[]>([]);
  protected readonly loading = signal(true);

  protected readonly form = this.fb.nonNullable.group({
    date: ['', Validators.required],
    name: ['', Validators.required],
  });

  constructor() { this.refresh(); }

  protected add(): void {
    if (!this.form.valid) return;
    const v = this.form.getRawValue();
    this.api.addHoliday({ date: v.date, name: v.name }).subscribe({
      next: (h) => {
        this.toasts.success(`Holiday "${h.name}" added`);
        this.holidays.update((cur) => [h, ...cur].sort((a, b) => a.date.localeCompare(b.date)));
        this.form.reset({ date: '', name: '' });
      },
      error: (e: unknown) => this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not add'),
    });
  }

  protected remove(h: Holiday): void {
    if (!confirm(`Remove "${h.name}" on ${h.date}?`)) return;
    this.api.removeHoliday(h.date).subscribe({
      next: () => {
        this.toasts.success('Holiday removed');
        this.holidays.update((cur) => cur.filter((x) => x.date !== h.date));
      },
      error: (e: unknown) => this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not remove'),
    });
  }

  private refresh(): void {
    this.api.listHolidays(new Date().getFullYear()).subscribe({
      next: (hs) => { this.holidays.set(hs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
