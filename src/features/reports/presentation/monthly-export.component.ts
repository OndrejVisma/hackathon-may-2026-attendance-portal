import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReportsApi } from '../infrastructure/reports-api';
import { ToastService } from '../../../shared/ui/toast.service';
import { ApiError } from '../../../shared/http/http-error';

const pad = (n: number): string => n.toString().padStart(2, '0');

@Component({
  selector: 'app-monthly-export',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="export-h">
      <h2 id="export-h">Monthly export</h2>
      <p>Generates the two-sheet XLSX (Dochádzka / Nadčas) per spec §11.1. BE builds the file.</p>

      <form [formGroup]="form" class="form">
        <label>
          Year
          <input type="number" formControlName="year" required min="2020" max="2100" />
        </label>
        <label>
          Month
          <input type="number" formControlName="month" required min="1" max="12" />
        </label>
        <label>
          Team (optional)
          <input type="text" formControlName="team_id" placeholder="all teams if empty" />
        </label>
      </form>

      <div class="buttons">
        <button type="button" [disabled]="busy()" (click)="download('sk')">
          {{ busyLang() === 'sk' ? 'Building…' : 'Download — Slovenčina' }}
        </button>
        <button type="button" [disabled]="busy()" (click)="download('en')">
          {{ busyLang() === 'en' ? 'Building…' : 'Download — English' }}
        </button>
      </div>
    </section>
  `,
  styles: [`
    section { padding: var(--space-4); background: var(--surface-raised); border-radius: var(--radius-md); }
    h2 { margin: 0 0 var(--space-2) 0; font-size: var(--font-size-heading-md); }
    p { color: var(--text-secondary); margin: 0 0 var(--space-3) 0; }
    .form { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-3); }
    label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    input { padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--surface-base); color: var(--text-primary); font: inherit; }
    .buttons { display: flex; gap: var(--space-3); }
    button { padding: var(--space-2) var(--space-4); background: var(--accent-primary); color: var(--text-inverse); border: 0; border-radius: var(--radius-md); cursor: pointer; font: inherit; &:disabled { opacity: 0.5; cursor: not-allowed; } }
  `],
})
export class MonthlyExportComponent {
  private readonly api = inject(ReportsApi);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);

  private readonly today = new Date();

  protected readonly form = this.fb.nonNullable.group({
    year:  [this.today.getFullYear(), [Validators.required]],
    month: [this.today.getMonth() + 1, [Validators.required, Validators.min(1), Validators.max(12)]],
    team_id: [''],
  });

  protected readonly busyLang = signal<'sk' | 'en' | null>(null);
  protected busy = () => this.busyLang() !== null;

  protected download(lang: 'sk' | 'en'): void {
    if (!this.form.valid) return;
    const v = this.form.getRawValue();
    this.busyLang.set(lang);
    this.api.downloadMonthlyXlsx(v.year, v.month, lang, v.team_id || null).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${v.year}-${pad(v.month)}-${v.team_id || 'all'}-${lang}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.busyLang.set(null);
        this.toasts.success('Download started');
      },
      error: (e: unknown) => {
        this.busyLang.set(null);
        this.toasts.error(e instanceof ApiError ? e.problem.title : 'Export failed');
      },
    });
  }
}
