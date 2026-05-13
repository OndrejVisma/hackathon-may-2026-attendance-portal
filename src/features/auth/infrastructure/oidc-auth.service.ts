import { Injectable, inject, signal } from '@angular/core';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { Observable, defer, switchMap, from, map, throwError } from 'rxjs';
import { OIDC_CONFIG } from './oidc-config';
import { AuthSession } from '../domain/auth-session';
import { ApiClient } from '../../../shared/http/api-client';
import { User } from '../domain/user';
import { log } from '../../../shared/logging/logger';

@Injectable({ providedIn: 'root' })
export class OidcAuthService {
  private readonly oauth = inject(OAuthService);
  private readonly cfg = inject(OIDC_CONFIG);
  private readonly session = inject(AuthSession);
  private readonly api = inject(ApiClient);

  readonly ready = signal(false);

  /** Call once at app startup. No-op when OIDC is disabled. */
  async configure(): Promise<void> {
    if (!this.cfg.enabled) { this.ready.set(true); return; }

    const oauthConfig: AuthConfig = {
      issuer: this.cfg.issuer,
      clientId: this.cfg.clientId,
      redirectUri: this.cfg.redirectUri,
      postLogoutRedirectUri: this.cfg.postLogoutRedirectUri,
      scope: this.cfg.scope,
      responseType: 'code',                    // Authorization Code (with PKCE)
      useSilentRefresh: true,
      silentRefreshTimeout: 5_000,
      timeoutFactor: 0.75,                     // refresh at 75% of token lifetime
      sessionChecksEnabled: true,
      requireHttps: this.cfg.issuer.startsWith('https://'),
      strictDiscoveryDocumentValidation: false,
      showDebugInformation: false,
    };

    this.oauth.configure(oauthConfig);
    try {
      await this.oauth.loadDiscoveryDocumentAndTryLogin();
      this.ready.set(true);
      this.oauth.setupAutomaticSilentRefresh();
    } catch (err: unknown) {
      log.error('oidc.discovery_failed', { issuer: this.cfg.issuer, err: String(err) });
      this.ready.set(true);    // app still usable via mock-login
    }
  }

  startLogin(): void {
    this.oauth.initCodeFlow();
  }

  /** Called by the /auth/callback page after the IdP redirect. */
  finishCallback(): Observable<User> {
    return defer(() => from(this.oauth.tryLoginCodeFlow())).pipe(
      switchMap(() => this.bindSession()),
    );
  }

  private bindSession(): Observable<User> {
    const accessToken = this.oauth.getAccessToken();
    const expiresAtMs = this.oauth.getAccessTokenExpiration();
    if (!accessToken) return throwError(() => new Error('No access token after OIDC callback'));

    const expiresInSeconds = Math.max(60, Math.floor((expiresAtMs - Date.now()) / 1000));
    return this.api.get<User>('/me').pipe(
      map((user) => {
        this.session.signIn(user, accessToken, expiresInSeconds);
        return user;
      }),
    );
  }

  async signOut(): Promise<void> {
    if (this.cfg.enabled && this.oauth.hasValidAccessToken()) {
      // Clears tokens + sends end-session request to IdP.
      await Promise.resolve(this.oauth.revokeTokenAndLogout().catch(() => void 0));
    }
    this.session.signOut();
  }
}
