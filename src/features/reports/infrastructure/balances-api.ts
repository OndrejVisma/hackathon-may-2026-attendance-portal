import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import { BalanceReport } from '../domain/balance';

@Injectable({ providedIn: 'root' })
export class BalancesApi {
  private readonly api = inject(ApiClient);

  mine(year?: number): Observable<BalanceReport> {
    return this.api.get<BalanceReport>('/me/balances', year !== undefined ? { year } : {});
  }

  forUser(userId: string, year?: number): Observable<BalanceReport> {
    return this.api.get<BalanceReport>(`/users/${userId}/balances`, year !== undefined ? { year } : {});
  }
}
