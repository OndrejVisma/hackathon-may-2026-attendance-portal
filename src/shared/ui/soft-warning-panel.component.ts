import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SoftWarning } from '../http/http-error';

@Component({
  selector: 'app-soft-warning-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (warnings().length > 0) {
      <div role="status" aria-live="polite" class="panel">
        <strong>Heads up:</strong>
        <ul>
          @for (w of warnings(); track w.rule_id) {
            <li>
              @if (w.rule_id; as id) { <span class="rule-id">{{ id }}</span> }
              {{ w.message ?? 'Soft warning' }}
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [`
    .panel {
      background: var(--state-warning-bg);
      color: var(--state-warning-fg);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--border-warning);
      margin: var(--space-3) 0;
    }
    ul { margin: var(--space-2) 0 0 0; padding-left: var(--space-6); }
    .rule-id {
      display: inline-block;
      padding: 0 var(--space-2);
      margin-right: var(--space-2);
      background: var(--state-warning-fg);
      color: var(--state-warning-bg);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-strong);
    }
  `],
})
export class SoftWarningPanelComponent {
  readonly warnings = input.required<readonly SoftWarning[]>();
}
