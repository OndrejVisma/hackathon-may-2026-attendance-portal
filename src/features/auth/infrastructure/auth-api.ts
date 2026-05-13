import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, map } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import type { components } from '../../../shared/http/generated/api-schema';
import { AuthSession } from '../domain/auth-session';
import { User } from '../domain/user';

type Tokens = components['schemas']['AuthTokens'];

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AuthSession);

  signInMock(userId: string): Observable<User> {
    return this.api.post<Tokens>('/auth/mock-login', { user_id: userId }).pipe(
      switchMap((tokens) => {
        // Store token first so subsequent /me call carries Bearer header.
        this.session.signIn({} as User, tokens.access_token, tokens.expires_in);
        return this.api.get<User>('/me').pipe(
          map((user) => {
            this.session.signIn(user, tokens.access_token, tokens.expires_in);
            return user;
          }),
        );
      }),
    );
  }

  signOut(): Observable<void> {
    return this.api.post<void>('/auth/logout').pipe(
      map(() => { this.session.signOut(); }),
    );
  }
}
