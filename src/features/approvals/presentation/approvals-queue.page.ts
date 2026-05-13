import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-approvals-queue',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Approvals</h1>
    <p>TODO: queue with filter (routed to me / via chain), approve/reject actions, self-approval guard, 30s polling.</p>
  `,
})
export class ApprovalsQueuePage {}
