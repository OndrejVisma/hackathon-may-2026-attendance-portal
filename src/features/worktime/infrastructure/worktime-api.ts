import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import { Worktime, WorktimeCreate, WorktimeUpdate } from '../domain/worktime';

@Injectable({ providedIn: 'root' })
export class WorktimeApi {
  private readonly api = inject(ApiClient);

  list(params?: { date_from?: string; date_to?: string }): Observable<Worktime[]> {
    return this.api.get<Worktime[]>('/worktime', params ?? {});
  }

  create(body: WorktimeCreate): Observable<Worktime> {
    return this.api.post<Worktime>('/worktime', body);
  }

  update(id: string, body: WorktimeUpdate, ifMatch?: string): Observable<Worktime> {
    return this.api.patch<Worktime>(`/worktime/${id}`, body, ifMatch);
  }

  remove(id: string, ifMatch?: string): Observable<void> {
    return this.api.delete<void>(`/worktime/${id}`, ifMatch);
  }
}
