import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { DocumentsQueuePage } from './documents-queue.page';
import { AuditLogPage } from '../../reports/presentation/audit-log.page';
import { QuotasPage } from '../../admin/presentation/quotas.page';
import { MonthlyExportComponent } from '../../reports/presentation/monthly-export.component';

type Tab = 'documents' | 'audit' | 'quotas' | 'export';

@Component({
  selector: 'app-hr-home',
  standalone: true,
  imports: [PageHeaderComponent, DocumentsQueuePage, AuditLogPage, QuotasPage, MonthlyExportComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="HR" subtitle="Documents, audit, quotas, export." />
    <div role="tablist" aria-label="HR sections" class="tabs">
      <button role="tab" [attr.aria-selected]="tab() === 'documents'" (click)="set('documents')">Documents queue</button>
      <button role="tab" [attr.aria-selected]="tab() === 'audit'"     (click)="set('audit')">Audit log</button>
      <button role="tab" [attr.aria-selected]="tab() === 'quotas'"    (click)="set('quotas')">Quotas</button>
      <button role="tab" [attr.aria-selected]="tab() === 'export'"    (click)="set('export')">Export</button>
    </div>
    @switch (tab()) {
      @case ('documents') { <app-documents-queue /> }
      @case ('audit')     { <app-audit-log /> }
      @case ('quotas')    { <app-quotas /> }
      @case ('export')    { <app-monthly-export /> }
    }
  `,
  styles: [`
    .tabs { display: flex; gap: var(--space-2); margin-bottom: var(--space-4); border-bottom: 1px solid var(--border-default); }
    button {
      padding: var(--space-2) var(--space-4);
      border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; font: inherit;
      border-bottom: 2px solid transparent;
      &[aria-selected='true'] { color: var(--text-primary); border-bottom-color: var(--accent-primary); }
    }
  `],
})
export class HrHomePage {
  protected readonly tab = signal<Tab>('documents');
  protected set(t: Tab): void { this.tab.set(t); }
}
