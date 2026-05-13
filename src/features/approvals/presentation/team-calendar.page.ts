import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReportsApi } from '../../reports/infrastructure/reports-api';
import type { components } from '../../../shared/http/generated/api-schema';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';

type CalendarGrid = components['schemas']['CalendarGrid'];
type CalendarRow = components['schemas']['CalendarRow'];
type CalendarCell = components['schemas']['CalendarCell'];

const pad = (n: number): string => n.toString().padStart(2, '0');
const ym = (d: Date): { year: number; month: number } => ({ year: d.getFullYear(), month: d.getMonth() + 1 });
const monthBounds = (year: number, month: number): { from: string; to: string; days: number } => {
  const last = new Date(year, month, 0).getDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}`, days: last };
};

@Component({
  selector: 'app-team-calendar',
  standalone: true,
  imports: [PageHeaderComponent, LoadingSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Team calendar" [subtitle]="monthLabel()" />

    <div class="nav">
      <button type="button" (click)="prevMonth()" aria-label="Previous month">←</button>
      <strong>{{ monthLabel() }}</strong>
      <button type="button" (click)="nextMonth()" aria-label="Next month">→</button>
      <button type="button" class="today" (click)="today()">Today</button>
    </div>

    @if (loading()) {
      <app-loading-skeleton [count]="6" />
    } @else if (grid()) {
      <div class="scroll">
        <table>
          <caption class="sr-only">Team calendar for {{ monthLabel() }}</caption>
          <thead>
            <tr>
              <th scope="col" class="name-col">Member</th>
              @for (d of days(); track d) {
                <th scope="col" [attr.data-weekend]="isWeekend(d)">{{ d }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rowsOf(); track rowKey(row)) {
              <tr>
                <th scope="row">{{ rowName(row) }}</th>
                @for (cell of row.cells ?? []; track cell.date) {
                  <td
                    [attr.data-kind]="cell.kind ?? 'empty'"
                    [attr.data-pending]="cell.pending_approval"
                    [attr.data-type]="cell.absence_type"
                    [title]="cellTitle(cell)">
                    @switch (cell.kind) {
                      @case ('work') { {{ formatHours(cell.worktime_hours) }} }
                      @case ('absence') { {{ absenceInitial(cell) }} }
                      @case ('weekend') { · }
                      @case ('holiday') { H }
                      @case ('mixed') { @if (cell.business_trip) { BT } @else { ½ } }
                      @default { · }
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    .nav { display: flex; gap: var(--space-3); align-items: center; margin-bottom: var(--space-3); }
    .nav button { padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); background: var(--surface-raised); border-radius: var(--radius-md); cursor: pointer; font: inherit; }
    .nav .today { margin-left: auto; }
    .scroll { overflow-x: auto; }
    table { border-collapse: collapse; min-width: 100%; }
    thead th {
      padding: var(--space-2);
      background: var(--surface-raised); color: var(--text-secondary);
      font-size: var(--font-size-caption); font-weight: var(--font-weight-strong);
      border-bottom: 1px solid var(--border-default);
      min-width: 28px; text-align: center;
      &[data-weekend='true'] { background: var(--surface-sunken); }
      &.name-col { text-align: left; min-width: 160px; position: sticky; left: 0; z-index: 1; }
    }
    tbody th {
      padding: var(--space-2); text-align: left;
      position: sticky; left: 0; z-index: 1;
      background: var(--surface-base); border-right: 1px solid var(--border-default);
    }
    tbody td {
      padding: var(--space-1); text-align: center;
      border-bottom: 1px solid var(--border-default);
      font-variant-numeric: tabular-nums; font-size: var(--font-size-caption);
      min-width: 28px; height: 28px;
      &[data-kind='weekend'] { background: var(--surface-sunken); color: var(--text-muted); }
      &[data-kind='holiday'] { background: var(--state-info-bg); color: var(--state-info-fg); }
      &[data-kind='work']    { background: var(--state-success-bg); color: var(--state-success-fg); }
      &[data-kind='absence'] { background: var(--state-warning-bg); color: var(--state-warning-fg); }
      &[data-kind='mixed']   { background: var(--accent-secondary); color: var(--text-inverse); }
      &[data-pending='true'] { outline: 2px dashed var(--border-warning); outline-offset: -3px; }
    }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `],
})
export class TeamCalendarPage {
  private readonly api = inject(ReportsApi);

  private readonly cursor = signal<Date>(new Date());
  protected readonly grid = signal<CalendarGrid | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.refresh();
  }

  protected readonly monthLabel = computed(() => {
    const d = this.cursor();
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  });

  protected readonly days = computed(() => {
    const { year, month } = ym(this.cursor());
    return Array.from({ length: monthBounds(year, month).days }, (_, i) => i + 1);
  });

  protected isWeekend(day: number): boolean {
    const d = new Date(this.cursor().getFullYear(), this.cursor().getMonth(), day);
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  }

  protected rowsOf(): readonly CalendarRow[] { return this.grid()?.members ?? []; }

  protected rowKey(r: CalendarRow): string { return r.user?.id ?? ''; }
  protected rowName(r: CalendarRow): string {
    return r.user ? `${r.user.first_name} ${r.user.last_name}` : '—';
  }

  protected formatHours(hours: number | undefined): string {
    const h = hours ?? 0;
    return Number.isInteger(h) ? h.toString() : h.toFixed(1);
  }

  protected absenceInitial(c: CalendarCell): string {
    const initial = c.absence_type?.[0]?.toUpperCase() ?? '';
    return c.pending_approval ? `${initial}?` : initial;
  }

  protected cellTitle(c: CalendarCell): string {
    if (!c.kind) return '';
    if (c.kind === 'absence') return `${c.absence_type ?? ''} ${c.pending_approval ? '(pending)' : ''}`.trim();
    if (c.kind === 'work') return `Work · ${c.worktime_hours ?? 0}h${c.business_trip ? ' · BT' : ''}`;
    return c.kind;
  }

  protected prevMonth(): void {
    this.cursor.update((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.refresh();
  }
  protected nextMonth(): void {
    this.cursor.update((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.refresh();
  }
  protected today(): void {
    this.cursor.set(new Date());
    this.refresh();
  }

  private refresh(): void {
    const { year, month } = ym(this.cursor());
    const { from, to } = monthBounds(year, month);
    this.loading.set(true);
    this.api.calendar({ date_from: from, date_to: to }).subscribe({
      next: (g) => { this.grid.set(g); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
}
