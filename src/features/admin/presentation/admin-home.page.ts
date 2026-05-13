import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { AdminUsersPage } from './users.page';
import { AdminTeamsPage } from './teams.page';
import { AdminHolidaysPage } from './holidays.page';
import { YearRolloverPage } from './year-rollover.page';

type Tab = 'users' | 'teams' | 'holidays' | 'rollover';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [PageHeaderComponent, AdminUsersPage, AdminTeamsPage, AdminHolidaysPage, YearRolloverPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Admin" subtitle="Users, teams, holidays, year-rollover." />
    <div role="tablist" aria-label="Admin sections" class="tabs">
      <button role="tab" [attr.aria-selected]="tab() === 'users'"    (click)="set('users')">Users</button>
      <button role="tab" [attr.aria-selected]="tab() === 'teams'"    (click)="set('teams')">Teams</button>
      <button role="tab" [attr.aria-selected]="tab() === 'holidays'" (click)="set('holidays')">Holidays</button>
      <button role="tab" [attr.aria-selected]="tab() === 'rollover'" (click)="set('rollover')">Year-rollover</button>
    </div>
    @switch (tab()) {
      @case ('users')    { <app-admin-users /> }
      @case ('teams')    { <app-admin-teams /> }
      @case ('holidays') { <app-admin-holidays /> }
      @case ('rollover') { <app-year-rollover /> }
    }
  `,
  styles: [`
    .tabs { display: flex; gap: var(--space-2); margin-bottom: var(--space-4); border-bottom: 1px solid var(--border-default); }
    button {
      padding: var(--space-2) var(--space-4);
      border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; font: inherit;
      border-bottom: 2px solid transparent;
      &[aria-selected='true'] { color: var(--text-primary); border-bottom-color: var(--accent-primary); }
    }
  `],
})
export class AdminHomePage {
  protected readonly tab = signal<Tab>('users');
  protected set(t: Tab): void { this.tab.set(t); }
}
