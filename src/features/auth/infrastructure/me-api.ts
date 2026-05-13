import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import type { components } from '../../../shared/http/generated/api-schema';

type UserDataExport = components['schemas']['UserDataExport'];

export interface UserPreferences {
  /** Mirror in-portal notifications to email per spec §10 / @email-channel scenarios. */
  readonly email_enabled: boolean;
  /** Send anonymous error reports to telemetry per FE refinement §18 / §38. */
  readonly telemetry_enabled: boolean;
  /** UI density: comfortable (default) or compact. */
  readonly density: 'comfortable' | 'compact';
}

@Injectable({ providedIn: 'root' })
export class MeApi {
  private readonly api = inject(ApiClient);

  // GDPR data-portability per spec §32. Endpoint exists on the mock server.
  dataExport(): Observable<UserDataExport> {
    return this.api.get<UserDataExport>('/me/data-export');
  }

  // GDPR deletion-request per spec §32. Endpoint exists; HR processes.
  requestDeletion(): Observable<void> {
    return this.api.post<void>('/me/deletion-request');
  }

  // Preference endpoints — wired here but the mock server returns 404 until
  // a real BE adds support. Try/catch in the page tolerates absence.
  getPreferences(): Observable<UserPreferences> {
    return this.api.get<UserPreferences>('/me/preferences');
  }

  updatePreferences(body: Partial<UserPreferences>): Observable<UserPreferences> {
    return this.api.patch<UserPreferences>('/me/preferences', body);
  }
}
