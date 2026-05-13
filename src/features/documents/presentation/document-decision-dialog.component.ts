import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-document-decision-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg aria-labelledby="doc-decision-h">
      <form [formGroup]="form" (ngSubmit)="confirm()" method="dialog">
        <h2 id="doc-decision-h">{{ heading() }}</h2>
        @if (mode() === 'reject') {
          <p>Reject the document. The reason is sent to the requester.</p>
          <label>
            Reason
            <textarea formControlName="reason" rows="4" required minlength="3" autofocus></textarea>
          </label>
        } @else {
          <p>Validate the document. This finalises the absence if the manager has also approved.</p>
        }
        <div class="actions">
          <button type="button" (click)="close()">Cancel</button>
          <button
            type="submit"
            [class.danger]="mode() === 'reject'"
            [disabled]="mode() === 'reject' && !form.valid">
            {{ mode() === 'reject' ? 'Reject' : 'Validate' }}
          </button>
        </div>
      </form>
    </dialog>
  `,
  styles: [`
    dialog { padding: 0; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--surface-base); color: var(--text-primary); min-width: 360px; max-width: min(560px, 92vw); }
    dialog::backdrop { background: rgba(0, 0, 0, 0.4); }
    form { padding: var(--space-4); }
    h2 { margin: 0 0 var(--space-2) 0; font-size: var(--font-size-heading-md); }
    p { color: var(--text-secondary); margin: 0 0 var(--space-3) 0; }
    label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-caption); color: var(--text-secondary); }
    textarea { padding: var(--space-2) var(--space-3); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--surface-base); color: var(--text-primary); font: inherit; width: 100%; resize: vertical; }
    .actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-3); }
    button { padding: var(--space-2) var(--space-4); border: 1px solid var(--border-default); background: var(--surface-base); color: var(--text-primary); border-radius: var(--radius-md); cursor: pointer; font: inherit; }
    button[type='submit']:not(.danger) { background: var(--state-success-fg); color: var(--state-success-bg); border-color: transparent; }
    button[type='submit'].danger       { background: var(--state-error-fg);   color: var(--state-error-bg);   border-color: transparent; &:disabled { opacity: 0.5; } }
  `],
})
export class DocumentDecisionDialogComponent implements OnInit, OnDestroy {
  @ViewChild('dlg', { static: true }) private readonly dlgRef!: ElementRef<HTMLDialogElement>;

  readonly mode = input.required<'approve' | 'reject'>();
  readonly confirmed = output<{ decision: 'approve' | 'reject'; reason?: string }>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.nonNullable.group({ reason: ['', [Validators.minLength(3)]] });

  protected heading(): string { return this.mode() === 'approve' ? 'Validate document' : 'Reject document'; }

  ngOnInit(): void {
    queueMicrotask(() => this.dlgRef.nativeElement.showModal());
    if (this.mode() === 'reject') this.form.controls.reason.addValidators(Validators.required);
  }

  ngOnDestroy(): void {
    if (this.dlgRef?.nativeElement.open) this.dlgRef.nativeElement.close();
  }

  protected confirm(): void {
    const mode = this.mode();
    if (mode === 'reject' && !this.form.valid) return;
    this.dlgRef.nativeElement.close();
    this.confirmed.emit({
      decision: mode,
      ...(mode === 'reject' ? { reason: this.form.controls.reason.value } : {}),
    });
  }

  protected close(): void {
    this.dlgRef.nativeElement.close();
    this.cancelled.emit();
  }
}
