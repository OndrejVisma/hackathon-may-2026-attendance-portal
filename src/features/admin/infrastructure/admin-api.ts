import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import type { components } from '../../../shared/http/generated/api-schema';

type User = components['schemas']['User'];
type UserCreate = components['schemas']['UserCreate'];
type UserUpdate = components['schemas']['UserUpdate'];
type Team = components['schemas']['Team'];
type Holiday = components['schemas']['Holiday'];
type QuotaDefaults = components['schemas']['QuotaDefaults'];
type QuotaOverride = components['schemas']['QuotaOverride'];
type YearRolloverRow = components['schemas']['YearRolloverRow'];

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly api = inject(ApiClient);

  // Users
  listUsers(): Observable<User[]>                                         { return this.api.get('/admin/users'); }
  createUser(body: UserCreate): Observable<User>                          { return this.api.post('/admin/users', body); }
  updateUser(id: string, body: UserUpdate, ifMatch?: string): Observable<User> { return this.api.patch(`/admin/users/${id}`, body, ifMatch); }
  deactivateUser(id: string, ifMatch?: string): Observable<void>         { return this.api.delete(`/admin/users/${id}`, ifMatch); }

  // Teams
  listTeams(): Observable<Team[]>                                         { return this.api.get('/admin/teams'); }
  createTeam(body: { name: string; member_ids?: string[] }): Observable<Team> { return this.api.post('/admin/teams', body); }
  updateTeam(id: string, body: Partial<Team>, ifMatch?: string): Observable<Team> { return this.api.patch(`/admin/teams/${id}`, body, ifMatch); }

  // Holidays
  listHolidays(year?: number): Observable<Holiday[]>                      { return this.api.get('/admin/holidays', year !== undefined ? { year } : {}); }
  addHoliday(body: Holiday): Observable<Holiday>                          { return this.api.post('/admin/holidays', body); }
  removeHoliday(date: string): Observable<void>                           { return this.api.delete(`/admin/holidays/${date}`); }

  // Quotas
  getQuotaDefaults(): Observable<QuotaDefaults>                           { return this.api.get('/admin/quota-config'); }
  updateQuotaDefaults(body: QuotaDefaults, ifMatch?: string): Observable<QuotaDefaults> {
    return this.api.patch('/admin/quota-config', body, ifMatch);
  }
  overrideQuota(body: QuotaOverride): Observable<QuotaOverride> {
    return this.api.post('/admin/quota-config/overrides', body);
  }

  // Year rollover
  previewRollover(): Observable<{ rows: YearRolloverRow[] }>             { return this.api.post('/admin/year-rollover/preview'); }
  applyRollover(): Observable<{ rows: YearRolloverRow[] }>                { return this.api.post('/admin/year-rollover/apply'); }
}
