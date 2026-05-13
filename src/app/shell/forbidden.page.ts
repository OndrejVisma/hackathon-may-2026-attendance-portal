import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Forbidden</h1>
    <p>You don't have permission to view this page.</p>
    <a href="/me">Back to my day</a>
  `,
})
export class ForbiddenPage {}
