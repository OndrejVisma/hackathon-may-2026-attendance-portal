import { InjectionToken } from '@angular/core';

// Per FE refinement §8 — OIDC Authorization Code + PKCE.
// No implicit, no resource-owner-password.

export interface OidcConfig {
  /** When false, the OIDC button is hidden and mock-login is the only path. */
  readonly enabled: boolean;
  /** OIDC discovery base — IdP's `/.well-known/openid-configuration` parent. */
  readonly issuer: string;
  /** Client ID registered with the IdP. */
  readonly clientId: string;
  /** Where the IdP redirects back to after auth — must match registered URI. */
  readonly redirectUri: string;
  /** Where to send the user after logout. */
  readonly postLogoutRedirectUri: string;
  /** Space-delimited scope string. `openid profile email` is the minimum. */
  readonly scope: string;
  /** Optional ID claim that maps to the BE's user_id (defaults to `sub`). */
  readonly userIdClaim?: string;
}

export const OIDC_CONFIG = new InjectionToken<OidcConfig>('OIDC_CONFIG');

// Default = disabled. Production config is injected by the build pipeline
// via env vars (see app.config.ts factory). Hackathon-local dev keeps mock
// login working without an IdP.
export const DEFAULT_OIDC_CONFIG: OidcConfig = {
  enabled: false,
  issuer: '',
  clientId: '',
  redirectUri: 'http://localhost:4300/auth/callback',
  postLogoutRedirectUri: 'http://localhost:4300/logged-out',
  scope: 'openid profile email',
};
