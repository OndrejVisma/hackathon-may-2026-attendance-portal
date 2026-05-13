import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-reject-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg aria-labelledby="reject-h">
      <form [formGroup]="form" (ngSubmit)="confirm()" method="dialog">
        <h2 id="reject-h">Reject request</h2>
        <p>Tell the requester why. The reason is sent in their notification.</p>
        <label>
          Reason
          <textarea
            formControlName="reason"
            rows="4"
            required
            minlength="3"
            aria-describedby="reject-help"
            autofocus></textarea>
          <span id="reject-help">At least 3 characters.</span>
        </label>
        <div class="actions">
          <button type="button" (click)="close()">Cancel</button>
          <button type="submit" [disabled]="!form.valid">Reject</button>
        </div>
      </form>
    </dialog>
  `,
  styles: [`
    dialog {
      padding: 0;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: var(--surface-base);
      color: var(--text-primary);
      min-width: 360px;
      max-width: min(560px, 92vw);
    }
    dialog::backdrop { background: rgba(0, 0, 0, 0.4); }
    form { padding: var(--space-4); }
    h2 { margin: 0 0 var(--space-2) 0; font-size: var(--font-size-heading-md); }
    p { color: var(--text-secondary); margin: 0 0 var(--space-3) 0; }
    label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    textarea {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      background: var(--surface-base);
      color: var(--text-primary);
      font: inherit;
      width: 100%; resize: vertical;
    }
    .actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-3); }
    button {
      padding: var(--space-2) var(--space-4);
      border: 1px solid var(--border-default); background: var(--surface-base); color: var(--text-primary);
      border-radius: var(--radius-md); cursor: pointer; font: inherit;
    }
    button[type='submit'] {
      background: var(--state-error-fg); color: var(--state-error-bg); border-color: transparent;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  `],
})
export class RejectDialogComponent implements OnInit, OnDestroy {
  @ViewChild('dlg', { static: true }) private readonly dlgRef!: ElementRef<HTMLDialogElement>;

  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit(): void {
    queueMicrotask(() => this.dlgRef.nativeElement.showModal());
  }

  ngOnDestroy(): void {
    if (this.dlgRef?.nativeElement.open) this.dlgRef.nativeElement.close();
  }

  protected confirm(): void {
    if (!this.form.valid) return;
    const reason = this.form.controls.reason.value;
    this.dlgRef.nativeElement.close();
    this.confirmed.emit(reason);
  }

  protected close(): void {
    this.dlgRef.nativeElement.close();
    this.cancelled.emit();
  }
}
