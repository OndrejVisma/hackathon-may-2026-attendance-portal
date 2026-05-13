import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import { ApprovalQueueItem, ApprovalRouting } from '../domain/approval';
import { Absence } from '../../absences/domain/absence';

@Injectable({ providedIn: 'root' })
export class ApprovalsApi {
  private readonly api = inject(ApiClient);

  queue(scope?: ApprovalRouting): Observable<ApprovalQueueItem[]> {
    return this.api.get<ApprovalQueueItem[]>('/approvals', scope ? { scope } : {});
  }

  approve(absenceId: string, ifMatch?: string): Observable<Absence> {
    return this.api.post<Absence>(`/approvals/${absenceId}/approve`, {}, ifMatch ? { 'If-Match': ifMatch } : undefined);
  }

  reject(absenceId: string, reason: string, ifMatch?: string): Observable<Absence> {
    return this.api.post<Absence>(`/approvals/${absenceId}/reject`, { reason }, ifMatch ? { 'If-Match': ifMatch } : undefined);
  }
}
