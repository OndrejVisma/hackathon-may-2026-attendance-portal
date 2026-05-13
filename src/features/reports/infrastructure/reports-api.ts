import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../../shared/http/api-config';
import { AuthSession } from '../../auth/domain/auth-session';
import type { components } from '../../../shared/http/generated/api-schema';
import { ApiClient } from '../../../shared/http/api-client';

type AuditEntry = components['schemas']['AuditEntry'];
type CalendarGrid = components['schemas']['CalendarGrid'];

@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiClient);
  private readonly cfg = inject(API_CONFIG);
  private readonly session = inject(AuthSession);

  calendar(params: { team_id?: string | null; date_from: string; date_to: string }): Observable<CalendarGrid> {
    return this.api.get<CalendarGrid>('/calendar', params);
  }

  auditLog(params?: { actor_id?: string; entity_id?: string; date_from?: string; date_to?: string; cursor?: string }): Observable<{ items: AuditEntry[]; next_cursor?: string | null }> {
    return this.api.get('/reports/audit-log', params ?? {});
  }

  // The XLSX download — BE owns the file. We just trigger and let the browser save.
  // Per FE refinement §28: filename + role check enforced by BE, URL has no PII.
  downloadMonthlyXlsx(year: number, month: number, lang: 'sk' | 'en', teamId?: string | null): Observable<Blob> {
    let url = `${this.cfg.baseUrl}/reports/monthly-export?year=${year}&month=${month}&lang=${lang}`;
    if (teamId) url += `&team_id=${encodeURIComponent(teamId)}`;
    const token = this.session.accessToken();
    const headers = new HttpHeaders(token ? { Authorization: `Bearer ${token}` } : {});
    return this.http.get(url, { responseType: 'blob', headers });
  }
}
