import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient } from '../../../shared/http/api-client';
import type { components } from '../../../shared/http/generated/api-schema';
import { AuthSession } from '../domain/auth-session';
import { User } from '../domain/user';

type MockLoginResponse = {
  user: User;
  tokens: components['schemas']['AuthTokens'];
};

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly api = inject(ApiClient);
  private readonly session = inject(AuthSession);

  signInMock(email: string): Observable<User> {
    return this.api.post<MockLoginResponse>('/auth/mock-login', { email }).pipe(
      map((res) => {
        this.session.signIn(res.user, res.tokens.access_token, res.tokens.expires_in);
        return res.user;
      }),
    );
  }

  signOut(): Observable<void> {
    return this.api.post<void>('/auth/logout').pipe(
      map(() => {
        this.session.signOut();
      }),
    );
  }
}
