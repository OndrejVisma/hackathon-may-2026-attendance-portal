import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-absence-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>New absence</h1>
    <p>TODO: type picker, date range, half-day, document upload, live balance, soft warnings, Save / Save anyway.</p>
  `,
})
export class AbsenceFormPage {}
