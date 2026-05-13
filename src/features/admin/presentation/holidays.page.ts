import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AdminApi } from '../infrastructure/admin-api';
import type { components } from '../../../shared/http/generated/api-schema';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';

type Holiday = components['schemas']['Holiday'];

interface DiffRow {
  readonly holiday: Holiday;
  readonly action: 'add' | 'duplicate' | 'invalid';
  readonly reason?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

    <h3>Bulk import (CSV)</h3>
    <p class="hint">
      CSV header: <code>date,name</code> &mdash; dates ISO (YYYY-MM-DD).
      The diff preview below lists every row before anything is committed.
    </p>
    <input #picker type="file" accept=".csv,text/csv" (change)="onCsvPicked($event)" />

    @if (diff().length > 0) {
      <table class="diff">
        <caption>Preview ({{ diff().length }} rows)</caption>
        <thead>
          <tr><th>Date</th><th>Name</th><th>Action</th><th>Notes</th></tr>
        </thead>
        <tbody>
          @for (row of diff(); track row.holiday.date) {
            <tr [attr.data-action]="row.action">
              <td>{{ row.holiday.date }}</td>
              <td>{{ row.holiday.name }}</td>
              <td>{{ row.action }}</td>
              <td>{{ row.reason ?? '' }}</td>
            </tr>
          }
        </tbody>
      </table>
      <div class="actions">
        <button type="button" (click)="diff.set([])">Discard</button>
        <button type="button" class="primary" [disabled]="!canApply() || applying()" (click)="applyDiff()">
          {{ applying() ? 'Applying…' : 'Confirm — apply ' + addCount() + ' adds' }}
        </button>
      </div>
    }

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
    .hint { color: var(--text-secondary); margin: 0 0 var(--space-2) 0; }
    code { padding: 0 var(--space-2); background: var(--surface-sunken); border-radius: var(--radius-sm); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    input[type='date'], input[type='text'], input[type='file'] {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-default); border-radius: var(--radius-sm);
      background: var(--surface-base); color: var(--text-primary); font: inherit;
    }
    label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    button { padding: var(--space-2) var(--space-4); background: var(--accent-primary); color: var(--text-inverse); border: 0; border-radius: var(--radius-md); cursor: pointer; font: inherit; &:disabled { opacity: 0.5; cursor: not-allowed; } }
    button:not(.primary) { background: transparent; color: var(--text-primary); border: 1px solid var(--border-default); }
    .actions { display: flex; gap: var(--space-3); margin: var(--space-3) 0; }
    table.diff { width: 100%; border-collapse: collapse; margin-top: var(--space-3); }
    table.diff caption { text-align: left; color: var(--text-secondary); padding: var(--space-2) 0; }
    table.diff th, table.diff td { padding: var(--space-2); text-align: left; border-bottom: 1px solid var(--border-default); }
    table.diff tr[data-action='duplicate'] td { background: var(--state-warning-bg); color: var(--state-warning-fg); }
    table.diff tr[data-action='invalid']   td { background: var(--state-error-bg); color: var(--state-error-fg); }
    .rows { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-2); }
    .rows li { padding: var(--space-2) var(--space-3); background: var(--surface-raised); border-radius: var(--radius-md); display: flex; gap: var(--space-3); align-items: center; }
    .date { font-variant-numeric: tabular-nums; min-width: 110px; color: var(--text-secondary); }
    .rows li button { margin-left: auto; padding: var(--space-1) var(--space-3); }
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

  protected readonly diff = signal<readonly DiffRow[]>([]);
  protected readonly applying = signal(false);

  constructor() { this.refresh(); }

  protected addCount = (): number => this.diff().filter((r) => r.action === 'add').length;
  protected canApply = (): boolean => this.addCount() > 0;

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

  protected onCsvPicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.parseCsv(String(reader.result ?? ''));
    reader.onerror = () => this.toasts.error('Could not read file');
    reader.readAsText(file);
  }

  private parseCsv(text: string): void {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { this.toasts.warn('Empty file'); return; }
    // Optional header.
    const header = lines[0] ?? '';
    const startAt = header.toLowerCase().startsWith('date') ? 1 : 0;

    const existing = new Set(this.holidays().map((h) => h.date));
    const rows: DiffRow[] = [];
    for (const raw of lines.slice(startAt)) {
      const [dateRaw, ...rest] = raw.split(',');
      const date = (dateRaw ?? '').trim();
      const name = rest.join(',').trim();
      if (!ISO_DATE.test(date)) {
        rows.push({ holiday: { date, name }, action: 'invalid', reason: 'Bad date format' });
        continue;
      }
      if (!name) {
        rows.push({ holiday: { date, name }, action: 'invalid', reason: 'Missing name' });
        continue;
      }
      if (existing.has(date)) {
        rows.push({ holiday: { date, name }, action: 'duplicate', reason: 'Already exists' });
        continue;
      }
      rows.push({ holiday: { date, name }, action: 'add' });
    }
    this.diff.set(rows);
    this.toasts.info(`Parsed ${rows.length} row(s) — review before applying.`);
  }

  protected applyDiff(): void {
    const adds = this.diff().filter((r) => r.action === 'add');
    if (adds.length === 0) return;
    this.applying.set(true);
    forkJoin(
      adds.map((r) =>
        this.api.addHoliday(r.holiday).pipe(
          map((h) => ({ ok: true as const, h })),
          catchError(() => of({ ok: false as const, h: r.holiday })),
        ),
      ),
    ).subscribe((results) => {
      this.applying.set(false);
      const ok = results.filter((r) => r.ok).map((r) => r.h);
      const failed = results.filter((r) => !r.ok).length;
      this.holidays.update((cur) =>
        [...cur, ...ok].sort((a, b) => a.date.localeCompare(b.date)),
      );
      this.diff.set([]);
      if (failed === 0) this.toasts.success(`Added ${ok.length} holiday(s)`);
      else this.toasts.warn(`Added ${ok.length}, ${failed} failed`);
    });
  }

  private refresh(): void {
    this.api.listHolidays(new Date().getFullYear()).subscribe({
      next: (hs) => { this.holidays.set(hs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
