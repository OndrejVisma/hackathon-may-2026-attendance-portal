import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSession, fullName, hasRole } from '../../features/auth';
import { AuthApi } from '../../features/auth/infrastructure/auth-api';
import { ThemeService } from './theme.service';
import { ToastHostComponent } from '../../shared/ui/toast-host.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header class="topbar" role="banner">
      <a routerLink="/" class="brand" aria-label="Attendance portal home">Attendance</a>
      <nav class="primary" aria-label="Primary">
        <a routerLink="/me" routerLinkActive="active">My day</a>
        <a routerLink="/balances" routerLinkActive="active">Balances</a>
        <a routerLink="/notifications" routerLinkActive="active">Notifications</a>
        @if (showApprovals()) { <a routerLink="/approvals" routerLinkActive="active">Approvals</a> }
        @if (showHr()) { <a routerLink="/hr" routerLinkActive="active">HR</a> }
        @if (showAdmin()) { <a routerLink="/admin" routerLinkActive="active">Admin</a> }
      </nav>
      <div class="actions">
        <button type="button" (click)="toggleTheme()" aria-label="Toggle theme">{{ themeLabel() }}</button>
        @if (user(); as u) {
          <span class="who">{{ fullNameOf(u) }}</span>
          <button type="button" (click)="signOut()">Sign out</button>
        }
      </div>
    </header>
    <main id="main-content" tabindex="-1">
      <router-outlet />
    </main>
    <app-toast-host />
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

  protected readonly user = this.session.user;
  protected fullNameOf = fullName;

  protected showApprovals(): boolean { const u = this.user(); return !!u && hasRole(u, 'manager'); }
  protected showHr():        boolean { const u = this.user(); return !!u && hasRole(u, 'hr'); }
  protected showAdmin():     boolean { const u = this.user(); return !!u && hasRole(u, 'admin'); }

  protected themeLabel(): string { return this.theme.preference() === 'dark' ? 'Light' : 'Dark'; }
  protected toggleTheme(): void   { this.theme.set(this.theme.preference() === 'dark' ? 'light' : 'dark'); }

  protected signOut(): void {
    this.authApi.signOut().subscribe({
      next: () => location.assign('/login'),
      error: () => { this.session.signOut(); location.assign('/login'); },
    });
  }
}
