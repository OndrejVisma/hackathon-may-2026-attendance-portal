import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthSession, fullName } from '../../auth';

@Component({
  selector: 'app-my-day',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>My day</h1>
    @if (session.user(); as u) {
      <p>Signed in as {{ fn(u) }} ({{ u.roles.join(', ') }})</p>
    }
    <p>TODO: calendar grid, worktime entry form, today's blocks, balance badge.</p>
  `,
})
export class MyDayPage {
  protected readonly session = inject(AuthSession);
  protected fn = fullName;
}
