import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logged-out',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main aria-labelledby="lo-h">
      <h1 id="lo-h">Signed out</h1>
      <p>Your session has ended. Close the tab or sign in again.</p>
      <a routerLink="/login" class="cta">Sign in again</a>
    </main>
  `,
  styles: [`
    main { max-width: 480px; padding: var(--space-6); margin: var(--space-12) auto; text-align: center; }
    p { color: var(--text-secondary); margin-bottom: var(--space-4); }
    .cta { display: inline-block; padding: var(--space-2) var(--space-4); background: var(--accent-primary); color: var(--text-inverse); text-decoration: none; border-radius: var(--radius-md); }
  `],
})
export class LoggedOutPage {}
