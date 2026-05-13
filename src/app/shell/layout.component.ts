import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSession, fullName, hasRole } from '../../features/auth';
import { AuthApi } from '../../features/auth/infrastructure/auth-api';
import { OidcAuthService } from '../../features/auth/infrastructure/oidc-auth.service';
import { OIDC_CONFIG } from '../../features/auth/infrastructure/oidc-config';
import { SessionGuard } from '../../features/auth/domain/session-guard.service';
import { ThemeService } from './theme.service';
import { ToastHostComponent } from '../../shared/ui/toast-host.component';
import { PrivacyNoticeComponent } from './privacy-notice.component';
import { OfflineBannerComponent } from './offline-banner.component';
import { ShortcutsOverlayComponent } from './shortcuts-overlay.component';
import { OnboardingTourComponent } from './onboarding-tour.component';
import { I18nService } from '../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../shared/i18n/t.pipe';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    ToastHostComponent, PrivacyNoticeComponent, OfflineBannerComponent, ShortcutsOverlayComponent,
    OnboardingTourComponent, TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="topbar" role="banner">
      <a routerLink="/" class="brand" aria-label="Attendance portal home">Attendance</a>
      <nav class="primary" aria-label="Primary">
        <a routerLink="/me"            routerLinkActive="active">{{ 'nav.myDay' | t }}</a>
        <a routerLink="/balances"      routerLinkActive="active">{{ 'nav.balances' | t }}</a>
        <a routerLink="/notifications" routerLinkActive="active">{{ 'nav.notifications' | t }}</a>
        @if (showApprovals()) {
          <a routerLink="/approvals"     routerLinkActive="active">{{ 'nav.approvals' | t }}</a>
          <a routerLink="/team-calendar" routerLinkActive="active">{{ 'nav.teamCalendar' | t }}</a>
        }
        @if (showHr())    { <a routerLink="/hr"    routerLinkActive="active">{{ 'nav.hr' | t }}</a> }
        @if (showAdmin()) { <a routerLink="/admin" routerLinkActive="active">{{ 'nav.admin' | t }}</a> }
      </nav>
      <div class="actions">
        <button type="button" (click)="toggleLocale()" [attr.aria-label]="'Locale: ' + i18n.locale()">
          {{ i18n.locale() === 'sk' ? 'EN' : 'SK' }}
        </button>
        <button type="button" (click)="toggleTheme()" aria-label="Toggle theme">{{ themeLabel() }}</button>
        @if (user(); as u) {
          <span class="who">{{ fullNameOf(u) }}</span>
          <button type="button" (click)="signOut()">{{ 'common.signOut' | t }}</button>
        }
      </div>
    </header>
    <main id="main-content" tabindex="-1">
      <router-outlet />
    </main>
    <app-offline-banner />
    <app-toast-host />
    <app-privacy-notice />
    <app-shortcuts-overlay />
    <app-onboarding-tour />
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .skip-link {
      position: absolute; left: -10000px;
      &:focus { left: var(--space-2); top: var(--space-2); background: var(--accent-primary); color: var(--text-inverse); padding: var(--space-2) var(--space-3); z-index: 1000; }
    }
    .topbar {
      display: flex; align-items: center; gap: var(--space-6);
      padding: var(--space-3) var(--space-6);
      background: var(--surface-raised);
      border-bottom: 1px solid var(--border-default);
      flex-wrap: wrap;
    }
    .brand { font-weight: var(--font-weight-heading); color: var(--text-primary); text-decoration: none; }
    .primary { display: flex; gap: var(--space-3); flex: 1; flex-wrap: wrap; }
    .primary a {
      color: var(--text-secondary); text-decoration: none;
      padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
      &.active { color: var(--text-primary); background: var(--surface-sunken); }
    }
    .actions { display: flex; align-items: center; gap: var(--space-3); }
    .who { color: var(--text-secondary); }
    button {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-default);
      background: var(--surface-base);
      color: var(--text-primary);
      border-radius: var(--radius-md);
      cursor: pointer; font: inherit;
    }
    main { padding: var(--space-6); }
  `],
})
export class LayoutComponent {
  private readonly session = inject(AuthSession);
  private readonly authApi = inject(AuthApi);
  private readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18nService);

  protected readonly user = this.session.user;
  protected fullNameOf = fullName;

  protected showApprovals(): boolean { const u = this.user(); return !!u && hasRole(u, 'manager'); }
  protected showHr():        boolean { const u = this.user(); return !!u && hasRole(u, 'hr'); }
  protected showAdmin():     boolean { const u = this.user(); return !!u && hasRole(u, 'admin'); }

  protected themeLabel(): string { return this.theme.preference() === 'dark' ? 'Light' : 'Dark'; }
  protected toggleTheme(): void   { this.theme.set(this.theme.preference() === 'dark' ? 'light' : 'dark'); }
  protected toggleLocale(): void  { this.i18n.set(this.i18n.locale() === 'sk' ? 'en' : 'sk'); }

  protected signOut(): void {
    // Real OIDC path (when enabled) revokes server-side + hits end-session endpoint.
    // Mock path just clears local tokens. Either way: broadcast to peer tabs.
    const guard = inject(SessionGuard);
    const oidc = inject(OidcAuthService);
    const cfg = inject(OIDC_CONFIG);
    const after = (): void => { guard.broadcastLogout(); location.assign('/logged-out'); };
    if (cfg.enabled) {
      void oidc.signOut().then(after).catch(after);
    } else {
      this.authApi.signOut().subscribe({ next: after, error: after });
    }
  }
}
