import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (i of rows(); track $index) {
      <div class="row" [style.width.%]="80 + (($index * 7) % 20)"></div>
    }
  `,
  styles: [`
    :host { display: block; padding: var(--space-2) 0; }
    .row {
      height: 16px;
      background: linear-gradient(90deg, var(--surface-sunken) 0%, var(--surface-raised) 50%, var(--surface-sunken) 100%);
      background-size: 200% 100%;
      border-radius: var(--radius-sm);
      margin: var(--space-2) 0;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
  `],
})
export class LoadingSkeletonComponent {
  readonly count = input<number>(3);
  protected rows = () => Array.from({ length: this.count() });
}
