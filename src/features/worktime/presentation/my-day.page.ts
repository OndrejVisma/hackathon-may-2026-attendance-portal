import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorktimeApi } from '../infrastructure/worktime-api';
import { Worktime } from '../domain/worktime';
import { WorktimeFormComponent } from './worktime-form.component';
import { WorktimeListComponent } from './worktime-list.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { LoadingSkeletonComponent } from '../../../shared/ui/loading-skeleton.component';
import { AbsencesApi } from '../../absences/infrastructure/absences-api';
import { Absence } from '../../absences/domain/absence';
import { MyAbsencesComponent } from '../../absences/presentation/my-absences.component';

const today = (): string => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-my-day',
  standalone: true,
  imports: [
    RouterLink,
    WorktimeFormComponent, WorktimeListComponent, MyAbsencesComponent,
    PageHeaderComponent, LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="My day" [subtitle]="todayLabel" />

    <section aria-labelledby="worktime-h">
      <h2 id="worktime-h">Worktime for today</h2>
      <app-worktime-form (saved)="onWorktimeSaved($event)" />
      @if (worktimeLoading()) {
        <app-loading-skeleton [count]="3" />
      } @else {
        <app-worktime-list [items]="worktime()" />
      }
    </section>

    <section aria-labelledby="absences-h">
      <div class="section-head">
        <h2 id="absences-h">My absences</h2>
        <a routerLink="/absences/new">+ New absence</a>
      </div>
      @if (absencesLoading()) {
        <app-loading-skeleton [count]="3" />
      } @else {
        <app-my-absences [items]="absences()" />
      }
    </section>
  `,
  styles: [`
    section { margin-bottom: var(--space-8); }
    h2 { font-size: var(--font-size-heading-md); margin: 0 0 var(--space-3) 0; }
    .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); }
    a {
      padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
      background: var(--accent-primary); color: var(--text-inverse); text-decoration: none;
    }
  `],
})
export class MyDayPage {
  protected readonly todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  private readonly worktimeApi = inject(WorktimeApi);
  private readonly absencesApi = inject(AbsencesApi);

  protected readonly worktime = signal<readonly Worktime[]>([]);
  protected readonly worktimeLoading = signal(true);

  protected readonly absences = signal<readonly Absence[]>([]);
  protected readonly absencesLoading = signal(true);

  constructor() {
    this.refreshWorktime();
    this.refreshAbsences();
  }

  protected onWorktimeSaved(w: Worktime): void {
    this.worktime.update((cur) => [...cur, w]);
  }

  private refreshWorktime(): void {
    const t = today();
    this.worktimeApi.list({ date_from: t, date_to: t }).subscribe({
      next: (rows) => { this.worktime.set(rows); this.worktimeLoading.set(false); },
      error: () => this.worktimeLoading.set(false),
    });
  }

  private refreshAbsences(): void {
    const from = new Date();
    from.setDate(1);
    const to = new Date();
    to.setMonth(to.getMonth() + 2);
    this.absencesApi.list({
      date_from: from.toISOString().slice(0, 10),
      date_to:   to.toISOString().slice(0, 10),
    }).subscribe({
      next: (rows) => { this.absences.set(rows); this.absencesLoading.set(false); },
      error: () => this.absencesLoading.set(false),
    });
  }
}
