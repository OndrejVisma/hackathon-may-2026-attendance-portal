import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="host" role="status" aria-live="polite" aria-atomic="false">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [attr.data-kind]="t.kind">
          <span>{{ t.message }}</span>
          <button type="button" (click)="toasts.dismiss(t.id)" aria-label="Dismiss">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .host {
      position: fixed; top: var(--space-4); right: var(--space-4);
      display: grid; gap: var(--space-2); z-index: 1000;
      max-width: 360px; pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-2);
      background: var(--surface-raised);
      color: var(--text-primary);
      border-left: 3px solid var(--accent-primary);
      &[data-kind='success'] { border-left-color: var(--border-success); }
      &[data-kind='warning'] { border-left-color: var(--border-warning); }
      &[data-kind='error']   { border-left-color: var(--border-error); }
    }
    button {
      background: transparent; border: 0;
      font-size: var(--font-size-heading-sm); cursor: pointer;
      color: var(--text-secondary);
    }
    @media (max-width: 767px) {
      .host { left: var(--space-4); right: var(--space-4); max-width: none; }
    }
  `],
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}
