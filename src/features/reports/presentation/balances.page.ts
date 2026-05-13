import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BalancesApi } from '../infrastructure/balances-api';
import { BalanceReport, Bucket } from '../domain/balance';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { ABSENCE_LABEL, AbsenceType } from '../../absences/domain/absence';

interface Row {
  readonly type: AbsenceType;
  readonly bucket: Bucket;
}

@Component({
  selector: 'app-balances',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Balances" [subtitle]="year() + ''" />

    @if (loading()) {
      <app-loading-skeleton [count]="5" />
    } @else if (report()) {
      <table>
        <caption class="sr-only">Balance per absence type for {{ report()?.year }}</caption>
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Allocated</th>
            <th scope="col">Used</th>
            <th scope="col">Reserved</th>
            <th scope="col">Remaining</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.type) {
            <tr>
              <th scope="row">{{ label(row.type) }}</th>
              <td>{{ vacationAllocated(row) }}</td>
              <td>{{ row.bucket.used ?? 0 }}</td>
              <td>{{ row.bucket.reserved ?? 0 }}</td>
              <td><strong>{{ row.bucket.remaining ?? 0 }}</strong></td>
              <td>
                @if (row.type === 'vacation' && row.bucket.bonus_withheld) {
                  <span class="withheld" title="Last year's leftover exceeded the carry-over limit (§6.3)">
                    Bonus withheld
                  </span>
                }
                @if (row.type === 'vacation' && (row.bucket.carried_over ?? 0) > 0) {
                  <span class="carry">+{{ row.bucket.carried_over }} carried over</span>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    table { width: 100%; border-collapse: collapse; }
    thead th { text-align: left; padding: var(--space-2); border-bottom: 1px solid var(--border-default); color: var(--text-secondary); font-weight: var(--font-weight-strong); }
    tbody td, tbody th { padding: var(--space-3) var(--space-2); border-bottom: 1px solid var(--border-default); text-align: left; }
    tbody td { font-variant-numeric: tabular-nums; }
    .withheld { color: var(--state-warning-fg); background: var(--state-warning-bg); padding: 0 var(--space-2); border-radius: var(--radius-sm); font-size: var(--font-size-caption); }
    .carry { color: var(--text-muted); font-size: var(--font-size-caption); margin-left: var(--space-2); }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `],
})
export class BalancesPage {
  private readonly api = inject(BalancesApi);

  protected readonly year = signal<number>(new Date().getFullYear());
  protected readonly report = signal<BalanceReport | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.api.mine(this.year()).subscribe({
      next: (r) => { this.report.set(r); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  protected label = (t: AbsenceType): string => ABSENCE_LABEL[t]?.sk ?? t;

  protected rows(): Row[] {
    const r = this.report(); if (!r) return [];
    const out: Row[] = [];
    const order: AbsenceType[] = ['vacation', 'sickday', 'paragraph', 'ocr', 'special'];
    for (const t of order) {
      const b = r.buckets[t as keyof typeof r.buckets];
      if (b) out.push({ type: t, bucket: b });
    }
    return out;
  }

  // For vacation: render statutory + bonus split per spec §6.5.
  protected vacationAllocated(row: Row): string {
    if (row.type !== 'vacation') return String(row.bucket.allocated ?? 0);
    const total = row.bucket.allocated ?? 0;
    const carried = row.bucket.carried_over ?? 0;
    return carried > 0 ? `${total} (incl. ${carried} carry-over)` : String(total);
  }
}
