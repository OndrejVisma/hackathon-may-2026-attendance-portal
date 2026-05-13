import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Admin</h1>
    <p>TODO: users invite, teams, holidays CSV import, project codes.</p>
  `,
})
export class AdminHomePage {}
