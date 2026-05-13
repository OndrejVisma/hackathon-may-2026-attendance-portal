import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Bucket } from '../../features/reports/domain/balance';

@Component({
  selector: 'app-balance-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [attr.data-low]="isLow()">
      <span class="num">{{ remaining() }}</span>
      <span class="unit">days</span>
      @if (reserved() > 0) { <span class="reserved">({{ reserved() }} reserved)</span> }
      @if (bucket()?.bonus_withheld) { <span class="withheld">bonus withheld</span> }
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      gap: var(--space-2);
      align-items: baseline;
      padding: var(--space-1) var(--space-3);
      background: var(--state-success-bg);
      color: var(--state-success-fg);
      border-radius: var(--radius-pill);
      font-size: var(--font-size-caption);
      &[data-low='true'] {
        background: var(--state-warning-bg);
        color: var(--state-warning-fg);
      }
    }
    .num { font-weight: var(--font-weight-strong); font-size: var(--font-size-body); }
    .reserved, .withheld { color: var(--text-muted); }
    .withheld { font-style: italic; }
  `],
})
export class BalanceBadgeComponent {
  readonly bucket = input<Bucket | undefined>();

  protected remaining = computed(() => this.bucket()?.remaining ?? 0);
  protected reserved  = computed(() => this.bucket()?.reserved ?? 0);
  protected isLow     = computed(() => (this.bucket()?.remaining ?? 0) <= 3);
}
