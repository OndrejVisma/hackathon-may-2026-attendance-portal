import { Injectable, effect, signal } from '@angular/core';
import { MigrationSpec, readPersisted, writePersisted, Versioned } from '../../shared/persistence/migrate';

type Preference = 'light' | 'dark' | 'system';

interface ThemeStateV1 extends Versioned { preference: Preference; }

// Migration spec: v0 (legacy plain string) → v1 (object with preference key).
// Demonstrates the §27 migration helper with a single forward step.
const SPEC: MigrationSpec<ThemeStateV1> = {
  storageKey: 'attendance.theme',
  currentVersion: 1,
  migrations: [
    (legacy: unknown): ThemeStateV1 => {
      // v0 was a bare string. v1 wraps it in an object so future fields
      // (e.g. density, accent) can land without a fresh key.
      const pref: Preference = legacy === 'light' || legacy === 'dark' || legacy === 'system' ? legacy : 'system';
      return { __schemaVersion: 1, preference: pref };
    },
  ],
  defaults: { __schemaVersion: 1, preference: 'system' },
  isValid: (b): b is ThemeStateV1 => {
    if (typeof b !== 'object' || b === null) return false;
    const x = b as Record<string, unknown>;
    return x['preference'] === 'light' || x['preference'] === 'dark' || x['preference'] === 'system';
  },
};

const systemPrefersDark = (): boolean =>
  window.matchMedia('(prefers-color-scheme: dark)').matches;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly preference = signal<Preference>(readPersisted(SPEC).preference);

  constructor() {
    effect(() => {
      const pref = this.preference();
      writePersisted(SPEC, { __schemaVersion: 1, preference: pref });
      this.applyToDom(pref);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.preference() === 'system') this.applyToDom('system');
    });
  }

  set(pref: Preference): void { this.preference.set(pref); }

  private applyToDom(pref: Preference): void {
    const root = document.documentElement;
    const effective = pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
    root.setAttribute('data-theme', effective);
  }
}
