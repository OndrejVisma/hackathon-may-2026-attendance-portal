import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Page not found</h1>
    <p>That URL doesn't exist in the portal.</p>
    <a href="/">Back to home</a>
  `,
})
export class NotFoundPage {}
