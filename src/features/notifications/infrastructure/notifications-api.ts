import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import { Notification } from '../domain/notification';

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly api = inject(ApiClient);

  list(params?: { read?: boolean; cursor?: string }): Observable<{ items: Notification[]; next_cursor?: string | null }> {
    return this.api.get('/me/notifications', params ?? {});
  }

  markRead(id: string): Observable<void> {
    return this.api.post<void>(`/me/notifications/${id}/read`);
  }
}
