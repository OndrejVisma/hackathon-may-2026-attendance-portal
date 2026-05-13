import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ApiError } from '../http/http-error';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error(); as e) {
      <div role="alert" aria-live="assertive" class="banner" [attr.data-rule]="e.ruleId">
        <strong>
          @if (e.ruleId; as r) { <span class="rule-id">{{ r }}</span> }
          {{ e.problem.title }}
        </strong>
        @if (e.problem.detail; as d) { <p>{{ d }}</p> }
        @if (e.problem.errors?.length) {
          <ul>
            @for (fe of e.problem.errors; track fe.field) {
              <li>{{ fe.field ?? '' }}: {{ fe.message ?? fe.code }}</li>
            }
          </ul>
        }
      </div>
    }
  `,
  styles: [`
    .banner {
      background: var(--state-error-bg);
      color: var(--state-error-fg);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      border-left: 3px solid var(--border-error);
      margin: var(--space-3) 0;
    }
    .rule-id {
      display: inline-block;
      padding: 0 var(--space-2);
      margin-right: var(--space-2);
      background: var(--state-error-fg);
      color: var(--state-error-bg);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-caption);
      font-weight: var(--font-weight-strong);
    }
    p { margin: var(--space-2) 0 0 0; }
    ul { margin: var(--space-2) 0 0 0; padding-left: var(--space-6); }
  `],
})
export class ErrorBannerComponent {
  readonly error = input<ApiError | null>(null);
}
