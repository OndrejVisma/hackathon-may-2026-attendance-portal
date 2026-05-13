import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../../shared/http/http-error';
import { WorktimeApi } from '../infrastructure/worktime-api';
import { Worktime, hoursBetween, isCrossMidnight, isValidTime } from '../domain/worktime';
import { ErrorBannerComponent } from '../../../shared/ui/error-banner.component';
import { SoftWarningPanelComponent } from '../../../shared/ui/soft-warning-panel.component';

@Component({
  selector: 'app-worktime-form',
  standalone: true,
  imports: [ReactiveFormsModule, ErrorBannerComponent, SoftWarningPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <fieldset>
        <legend>Log worktime</legend>

        <div class="row">
          <label>
            Date
            <input type="date" formControlName="date" required />
          </label>
          <label>
            Start
            <input type="time" formControlName="start_time" required step="60" />
          </label>
          <label>
            End
            <input type="time" formControlName="end_time" required step="60" />
          </label>
          <label class="hours">
            Total
            <output>{{ hoursDisplay() }}</output>
          </label>
        </div>

        <div class="row">
          <label class="grow">
            Project code
            <input type="text" formControlName="project_code" placeholder="GENERAL" />
          </label>
          <label class="checkbox">
            <input type="checkbox" formControlName="business_trip" />
            Business trip
          </label>
        </div>

        <label class="grow">
          Note (optional)
          <textarea formControlName="note" rows="2"></textarea>
        </label>

        @if (crossMidnight()) {
          <p class="inline-error" role="alert">Worktime cannot cross midnight (rule H1).</p>
        }

        <app-error-banner [error]="error()" />
        <app-soft-warning-panel [warnings]="warnings()" />

        <div class="actions">
          <button type="submit" [disabled]="!canSubmit()">
            {{ submitting() ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </fieldset>
    </form>
  `,
  styles: [`
    fieldset { border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: var(--space-4); }
    legend { font-weight: var(--font-weight-strong); padding: 0 var(--space-2); }
    .row { display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: end; margin-bottom: var(--space-3); }
    .row .grow { flex: 1 1 200px; }
    label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    label.checkbox { flex-direction: row; align-items: center; gap: var(--space-2); padding-bottom: var(--space-2); }
    input[type='date'], input[type='time'], input[type='text'], textarea {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      background: var(--surface-base);
      color: var(--text-primary);
      font: inherit;
    }
    .hours output {
      padding: var(--space-2) var(--space-3);
      background: var(--surface-sunken);
      border-radius: var(--radius-sm);
      font-variant-numeric: tabular-nums;
    }
    .inline-error { color: var(--state-error-fg); margin: 0 0 var(--space-2) 0; }
    .actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-3); }
    button {
      padding: var(--space-2) var(--space-4);
      background: var(--accent-primary); color: var(--text-inverse);
      border: 0; border-radius: var(--radius-md); cursor: pointer; font: inherit;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  `],
})
export class WorktimeFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(WorktimeApi);

  readonly saved = output<Worktime>();

  protected readonly form = this.fb.nonNullable.group({
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    start_time: ['08:00', Validators.required],
    end_time: ['16:00', Validators.required],
    project_code: ['GENERAL'],
    business_trip: [false],
    note: [''],
  });

  protected readonly submitting = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly warnings = signal<readonly { rule_id?: string; message?: string }[]>([]);

  private value = () => this.form.getRawValue();

  protected hoursDisplay = computed(() => {
    const v = this.form.getRawValue();
    if (!isValidTime(v.start_time) || !isValidTime(v.end_time)) return '—';
    if (isCrossMidnight(v.start_time, v.end_time)) return '—';
    return `${hoursBetween(v.start_time, v.end_time).toFixed(1)} h`;
  });

  protected crossMidnight = computed(() => {
    const v = this.form.getRawValue();
    return isValidTime(v.start_time) && isValidTime(v.end_time) && isCrossMidnight(v.start_time, v.end_time);
  });

  protected canSubmit = (): boolean =>
    this.form.valid && !this.crossMidnight() && !this.submitting();

  protected submit(): void {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.warnings.set([]);
    const v = this.value();
    const payload = {
      date: v.date,
      start_time: v.start_time,
      end_time: v.end_time,
      project_code: v.project_code || 'GENERAL',
      business_trip: v.business_trip,
      ...(v.note ? { note: v.note } : {}),
    };
    this.api.create(payload).subscribe({
      next: (saved) => {
        this.submitting.set(false);
        this.warnings.set(saved.soft_warnings ?? []);
        this.saved.emit(saved);
        this.form.patchValue({ note: '' });
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(err instanceof ApiError ? err : null);
      },
    });
  }
}
