import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import { Absence, AbsenceCreate, AbsenceUpdate } from '../domain/absence';

@Injectable({ providedIn: 'root' })
export class AbsencesApi {
  private readonly api = inject(ApiClient);

  list(params?: { date_from?: string; date_to?: string; state?: string }): Observable<Absence[]> {
    return this.api.get<Absence[]>('/absences', params ?? {});
  }

  get(id: string): Observable<Absence> {
    return this.api.get<Absence>(`/absences/${id}`);
  }

  // Per OpenAPI: POST /absences creates a draft (so document upload can attach),
  // then POST /absences/{id}/submit transitions draft → pending.
  createDraft(body: AbsenceCreate): Observable<Absence> {
    return this.api.post<Absence>('/absences', body);
  }

  update(id: string, body: AbsenceUpdate, ifMatch?: string): Observable<Absence> {
    return this.api.patch<Absence>(`/absences/${id}`, body, ifMatch);
  }

  submit(id: string, ifMatch?: string): Observable<Absence> {
    return this.api.post<Absence>(`/absences/${id}/submit`, {}, ifMatch ? { 'If-Match': ifMatch } : undefined);
  }

  withdraw(id: string, ifMatch?: string): Observable<Absence> {
    return this.api.post<Absence>(`/absences/${id}/withdraw`, {}, ifMatch ? { 'If-Match': ifMatch } : undefined);
  }

  cancel(id: string, ifMatch?: string): Observable<Absence> {
    return this.api.post<Absence>(`/absences/${id}/cancel`, {}, ifMatch ? { 'If-Match': ifMatch } : undefined);
  }

  uploadDocument(absenceId: string, file: File): Observable<{ id: string }> {
    return this.api.upload<{ id: string }>(`/absences/${absenceId}/documents`, file);
  }
}
