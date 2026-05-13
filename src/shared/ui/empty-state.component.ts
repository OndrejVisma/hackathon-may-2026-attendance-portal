import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status">
      <h2>{{ title() }}</h2>
      @if (description(); as d) { <p>{{ d }}</p> }
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host > div {
      padding: var(--space-12) var(--space-6);
      text-align: center;
      border: 1px dashed var(--border-default);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
    }
    h2 { margin: 0 0 var(--space-2) 0; font-size: var(--font-size-heading-md); color: var(--text-primary); }
    p { margin: 0; }
  `],
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
