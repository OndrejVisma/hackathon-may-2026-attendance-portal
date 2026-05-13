import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import { Document } from '../domain/document';

@Injectable({ providedIn: 'root' })
export class DocumentsApi {
  private readonly api = inject(ApiClient);

  // HR documents queue
  pending(): Observable<Document[]> {
    return this.api.get<Document[]>('/documents', { state: 'pending_validation' });
  }

  get(id: string): Observable<Document> {
    return this.api.get<Document>(`/documents/${id}`);
  }

  validate(id: string, decision: 'approve' | 'reject', reason?: string, ifMatch?: string): Observable<Document> {
    return this.api.post<Document>(
      `/documents/${id}/validate`,
      { decision, reason },
      ifMatch ? { 'If-Match': ifMatch } : undefined,
    );
  }
}
