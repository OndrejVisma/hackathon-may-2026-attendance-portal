import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApi } from '../infrastructure/admin-api';
import type { components } from '../../../shared/http/generated/api-schema';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';
import { ErrorBannerComponent } from '../../../shared/ui/error-banner.component';

type QuotaDefaults = components['schemas']['QuotaDefaults'];

@Component({
  selector: 'app-quotas',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeaderComponent, LoadingSkeletonComponent, ErrorBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Quotas" subtitle="Global defaults + per-user overrides (per spec §6)." />

    @if (loading()) {
      <app-loading-skeleton [count]="4" />
    } @else {
      <form [formGroup]="form" (ngSubmit)="saveDefaults()">
        <fieldset>
          <legend>Global defaults (annual, working days)</legend>
          <div class="grid">
            <label>Statutory vacation <input type="number" min="0" formControlName="statutory_vacation" /></label>
            <label>Bonus vacation     <input type="number" min="0" formControlName="bonus_vacation" /></label>
            <label>Sickday            <input type="number" min="0" formControlName="sickday" /></label>
            <label>Paragraph          <input type="number" min="0" formControlName="paragraph" /></label>
            <label>OCR                <input type="number" min="0" formControlName="ocr" /></label>
            <label>Special            <input type="number" min="0" formControlName="special" /></label>
            <label>Carry-over limit   <input type="number" min="0" formControlName="carry_over_limit" /></label>
          </div>
          <app-error-banner [error]="error()" />
          <div class="actions">
            <button type="submit" [disabled]="!form.valid || saving()">{{ saving() ? 'Saving…' : 'Save defaults' }}</button>
          </div>
        </fieldset>
      </form>

      <fieldset class="override">
        <legend>Per-user override</legend>
        <p class="hint">Existing user-level overrides win against defaults. Updating defaults won't touch them.</p>
        <form [formGroup]="overrideForm" (ngSubmit)="saveOverride()">
          <div class="grid">
            <label>User ID         <input type="text" formControlName="user_id" required /></label>
            <label>Statutory       <input type="number" min="0" formControlName="statutory_vacation" /></label>
            <label>Bonus           <input type="number" min="0" formControlName="bonus_vacation" /></label>
            <label>Sickday         <input type="number" min="0" formControlName="sickday" /></label>
            <label>Paragraph       <input type="number" min="0" formControlName="paragraph" /></label>
            <label>OCR             <input type="number" min="0" formControlName="ocr" /></label>
            <label>Special         <input type="number" min="0" formControlName="special" /></label>
          </div>
          <div class="actions">
            <button type="submit" [disabled]="!overrideForm.controls.user_id.value">Save override</button>
          </div>
        </form>
      </fieldset>
    }
  `,
  styles: [`
    fieldset { border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-4); }
    fieldset.override { background: var(--surface-sunken); }
    legend { font-weight: var(--font-weight-strong); padding: 0 var(--space-2); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-3); }
    label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    input { padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--surface-base); color: var(--text-primary); font: inherit; }
    .hint { color: var(--text-secondary); }
    .actions { display: flex; justify-content: flex-end; margin-top: var(--space-3); }
    button { padding: var(--space-2) var(--space-4); background: var(--accent-primary); color: var(--text-inverse); border: 0; border-radius: var(--radius-md); cursor: pointer; font: inherit; &:disabled { opacity: 0.5; cursor: not-allowed; } }
  `],
})
export class QuotasPage {
  private readonly api = inject(AdminApi);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);

  protected readonly form = this.fb.nonNullable.group({
    statutory_vacation: [20, [Validators.required, Validators.min(0)]],
    bonus_vacation: [3, [Validators.required, Validators.min(0)]],
    sickday: [3, [Validators.required, Validators.min(0)]],
    paragraph: [7, [Validators.required, Validators.min(0)]],
    ocr: [7, [Validators.required, Validators.min(0)]],
    special: [5, [Validators.required, Validators.min(0)]],
    carry_over_limit: [5, [Validators.required, Validators.min(0)]],
  });

  protected readonly overrideForm = this.fb.nonNullable.group({
    user_id: ['', Validators.required],
    statutory_vacation: [null as number | null],
    bonus_vacation: [null as number | null],
    sickday: [null as number | null],
    paragraph: [null as number | null],
    ocr: [null as number | null],
    special: [null as number | null],
  });

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<ApiError | null>(null);

  constructor() {
    this.api.getQuotaDefaults().subscribe({
      next: (q) => { this.form.patchValue(q as Partial<QuotaDefaults>); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected saveDefaults(): void {
    if (!this.form.valid) return;
    this.saving.set(true); this.error.set(null);
    this.api.updateQuotaDefaults(this.form.getRawValue()).subscribe({
      next: () => { this.saving.set(false); this.toasts.success('Defaults saved.'); },
      error: (e: unknown) => { this.saving.set(false); this.error.set(e instanceof ApiError ? e : null); },
    });
  }

  protected saveOverride(): void {
    const v = this.overrideForm.getRawValue();
    if (!v.user_id) return;
    const body = {
      user_id: v.user_id,
      ...(v.statutory_vacation !== null ? { statutory_vacation: v.statutory_vacation } : {}),
      ...(v.bonus_vacation !== null ? { bonus_vacation: v.bonus_vacation } : {}),
      ...(v.sickday !== null ? { sickday: v.sickday } : {}),
      ...(v.paragraph !== null ? { paragraph: v.paragraph } : {}),
      ...(v.ocr !== null ? { ocr: v.ocr } : {}),
      ...(v.special !== null ? { special: v.special } : {}),
    };
    this.api.overrideQuota(body).subscribe({
      next: () => this.toasts.success('Override saved.'),
      error: (e: unknown) => this.toasts.error(e instanceof ApiError ? e.problem.title : 'Could not save'),
    });
  }
}
