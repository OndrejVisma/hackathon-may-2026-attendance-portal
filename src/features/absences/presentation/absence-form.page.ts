import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AbsencesApi } from '../infrastructure/absences-api';
import { ABSENCE_LABEL, ABSENCE_TYPES, AbsenceType, canHaveHalfDay, requiresDocument } from '../domain/absence';
import { ApiError } from '../../../shared/http/http-error';
import { ErrorBannerComponent } from '../../../shared/ui/error-banner.component';
import { SoftWarningPanelComponent } from '../../../shared/ui/soft-warning-panel.component';
import { BalanceBadgeComponent } from '../../../shared/ui/balance-badge.component';
import { FileUploadComponent } from './file-upload.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { BalancesApi } from '../../reports/infrastructure/balances-api';
import { BalanceReport, Bucket } from '../../reports/domain/balance';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

@Component({
  selector: 'app-absence-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ErrorBannerComponent, SoftWarningPanelComponent, BalanceBadgeComponent,
    FileUploadComponent, PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="New absence" subtitle="Submit a vacation, sickday, paragraph or other absence." />

    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <fieldset>
        <legend>Type</legend>
        <div class="types">
          @for (t of types; track t) {
            <label class="type">
              <input type="radio" formControlName="type" [value]="t" />
              <span>{{ label(t) }}</span>
            </label>
          }
        </div>
        @if (currentBucket(); as b) {
          <div class="balance-row">
            Remaining: <app-balance-badge [bucket]="b" />
          </div>
        }
      </fieldset>

      <fieldset>
        <legend>Dates</legend>
        <div class="row">
          <label>
            From
            <input type="date" formControlName="date_from" required />
          </label>
          <label>
            To
            <input type="date" formControlName="date_to" required />
          </label>
        </div>
        @if (showHalfDay()) {
          <label class="checkbox">
            <input type="checkbox" formControlName="half_day" />
            Half day
          </label>
          @if (form.controls.half_day.value) {
            <fieldset class="slot">
              <legend>Slot</legend>
              <label><input type="radio" formControlName="half_day_slot" value="morning" /> Morning</label>
              <label><input type="radio" formControlName="half_day_slot" value="afternoon" /> Afternoon</label>
            </fieldset>
          }
        }
      </fieldset>

      <fieldset>
        <legend>Comment (optional)</legend>
        <textarea formControlName="comment" rows="3" maxlength="500"></textarea>
      </fieldset>

      @if (showDocument()) {
        <fieldset>
          <legend>Document {{ documentRequired() ? '(required)' : '' }}</legend>
          <p class="hint">{{ documentRequired() ? 'Per rule H8 this absence type requires a document and HR approval.' : 'Attach a supporting document if you have one.' }}</p>
          <app-file-upload [disabled]="submitting()" (filesPicked)="onFilesPicked($event)" />
        </fieldset>
      }

      <app-error-banner [error]="error()" />
      <app-soft-warning-panel [warnings]="warnings()" />

      <div class="actions">
        @if (warnings().length > 0 && !error()) {
          <button type="button" class="secondary" (click)="cancel()">Edit</button>
          <button type="submit" [disabled]="!canSubmit()">{{ submitting() ? 'Saving…' : 'Save anyway' }}</button>
        } @else {
          <button type="button" class="secondary" (click)="cancel()">Cancel</button>
          <button type="submit" [disabled]="!canSubmit()">{{ submitting() ? 'Saving…' : 'Save' }}</button>
        }
      </div>
    </form>
  `,
  styles: [`
    form { display: grid; gap: var(--space-4); max-width: 720px; }
    fieldset { border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: var(--space-4); }
    fieldset.slot { display: flex; gap: var(--space-4); padding: var(--space-2) var(--space-4); margin-top: var(--space-2); }
    legend { font-weight: var(--font-weight-strong); padding: 0 var(--space-2); }
    .types { display: grid; gap: var(--space-2); grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
    .type { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-md); cursor: pointer; }
    .type:has(input:checked) { border-color: var(--accent-primary); background: var(--state-info-bg); }
    .row { display: flex; gap: var(--space-3); flex-wrap: wrap; }
    label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    label.checkbox { flex-direction: row; align-items: center; }
    input[type='date'], input[type='time'], input[type='text'], textarea {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      background: var(--surface-base);
      color: var(--text-primary);
      font: inherit;
    }
    textarea { width: 100%; min-height: 64px; resize: vertical; }
    .balance-row { margin-top: var(--space-3); display: flex; gap: var(--space-2); align-items: center; }
    .hint { color: var(--text-secondary); margin: 0 0 var(--space-3) 0; }
    .actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-2); }
    button {
      padding: var(--space-2) var(--space-4);
      background: var(--accent-primary); color: var(--text-inverse);
      border: 0; border-radius: var(--radius-md); cursor: pointer; font: inherit;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    button.secondary { background: transparent; color: var(--text-primary); border: 1px solid var(--border-default); }
  `],
})
export class AbsenceFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AbsencesApi);
  private readonly balancesApi = inject(BalancesApi);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly types = ABSENCE_TYPES;
  protected label = (t: AbsenceType): string => ABSENCE_LABEL[t]?.sk ?? t;

  protected readonly form = this.fb.nonNullable.group({
    type: ['vacation' as AbsenceType, Validators.required],
    date_from: [new Date().toISOString().slice(0, 10), Validators.required],
    date_to: [new Date().toISOString().slice(0, 10), Validators.required],
    half_day: [false],
    half_day_slot: ['morning' as 'morning' | 'afternoon'],
    comment: [''],
  });

  private readonly pickedFiles = signal<readonly File[]>([]);
  protected readonly submitting = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly warnings = signal<readonly { rule_id?: string; message?: string }[]>([]);
  protected readonly balance = signal<BalanceReport | null>(null);

  constructor() {
    this.balancesApi.mine().subscribe({
      next: (b) => this.balance.set(b),
      error: () => {/* tolerate — form still usable */},
    });
  }

  protected showHalfDay = computed(() => canHaveHalfDay(this.form.controls.type.value));
  protected showDocument = computed(() => requiresDocument(this.form.controls.type.value));
  protected documentRequired = computed(() => this.form.controls.type.value === 'paragraph');

  protected currentBucket = computed((): Bucket | undefined => {
    const b = this.balance(); if (!b) return undefined;
    const t = this.form.controls.type.value;
    switch (t) {
      case 'vacation':  return b.buckets.vacation;
      case 'sickday':   return b.buckets.sickday;
      case 'paragraph': return b.buckets.paragraph;
      case 'ocr':       return b.buckets.ocr;
      case 'special':   return b.buckets.special;
      default: return undefined;
    }
  });

  protected canSubmit(): boolean {
    if (this.submitting()) return false;
    if (!this.form.valid) return false;
    if (this.documentRequired() && this.pickedFiles().length === 0) return false;
    return true;
  }

  protected onFilesPicked(files: readonly File[]): void {
    this.pickedFiles.set(files);
  }

  protected submit(): void {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    const draft = {
      type: v.type,
      date_from: v.date_from,
      date_to: v.date_to,
      half_day: this.showHalfDay() && v.half_day,
      ...(this.showHalfDay() && v.half_day ? { half_day_slot: v.half_day_slot } : {}),
      ...(v.comment ? { comment: v.comment } : {}),
    };

    this.api.createDraft(draft).pipe(
      switchMap((created) => {
        const files = this.pickedFiles();
        const uploads = files.length > 0
          ? forkJoin(files.map((f) => this.api.uploadDocument(created.id, f)))
          : of([]);
        return uploads.pipe(switchMap(() => this.api.submit(created.id)));
      }),
      catchError((err: unknown) => {
        this.submitting.set(false);
        if (err instanceof ApiError) this.error.set(err);
        return of(null);
      }),
    ).subscribe((submitted) => {
      this.submitting.set(false);
      if (!submitted) return;
      this.warnings.set(submitted.soft_warnings ?? []);
      this.toasts.success('Absence submitted.');
      void this.router.navigate(['/me']);
    });
  }

  protected cancel(): void {
    void this.router.navigate(['/me']);
  }
}
