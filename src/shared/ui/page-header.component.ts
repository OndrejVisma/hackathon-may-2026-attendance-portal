import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <h1>{{ title() }}</h1>
      @if (subtitle(); as s) { <p>{{ s }}</p> }
    </header>
  `,
  styles: [`
    header { margin-bottom: var(--space-6); }
    h1 { font-size: var(--font-size-heading-lg); margin: 0 0 var(--space-1) 0; }
    p  { color: var(--text-secondary); margin: 0; }
  `],
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
