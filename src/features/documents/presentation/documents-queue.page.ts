import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-documents-queue',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>HR documents</h1>
    <p>TODO: pending documents list with PDF preview, approve/reject-with-reason actions.</p>
  `,
})
export class DocumentsQueuePage {}
