import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OidcAuthService } from '../infrastructure/oidc-auth.service';
import { ApiError } from '../../../shared/http/http-error';
import { ErrorBannerComponent } from '../../../shared/ui/error-banner.component';

@Component({
  selector: 'app-oidc-callback',
  standalone: true,
  imports: [ErrorBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main aria-labelledby="cb-h">
      <h1 id="cb-h">Signing you in…</h1>
      <p>Finishing OpenID Connect handshake. You will be redirected shortly.</p>
      <app-error-banner [error]="error()" />
    </main>
  `,
  styles: [`
    main { max-width: 480px; padding: var(--space-6); margin: var(--space-12) auto; text-align: center; }
    p { color: var(--text-secondary); }
  `],
})
export class OidcCallbackPage {
  private readonly oidc = inject(OidcAuthService);
  private readonly router = inject(Router);
  protected readonly error = signal<ApiError | null>(null);

  constructor() {
    this.oidc.finishCallback().subscribe({
      next: () => { void this.router.navigate(['/me']); },
      error: (e: unknown) => {
        if (e instanceof ApiError) this.error.set(e);
        else this.error.set(new ApiError(0, { type: 'urn:auth:callback', title: 'Sign-in failed', status: 0 }));
      },
    });
  }
}
