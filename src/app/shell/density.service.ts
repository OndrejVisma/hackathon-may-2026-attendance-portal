import { Injectable, effect, signal } from '@angular/core';
import { MigrationSpec, readPersisted, writePersisted, Versioned } from '../../shared/persistence/migrate';

// Per FE refinement §1 — "Comfortable" (default) and "Compact" density modes.
// CSS hooks read `data-density` on <html>. Useful for HR/admin who live in the portal.

export type Density = 'comfortable' | 'compact';

interface DensityState extends Versioned { density: Density; }

const SPEC: MigrationSpec<DensityState> = {
  storageKey: 'attendance.density',
  currentVersion: 1,
  migrations: [],
  defaults: { __schemaVersion: 1, density: 'comfortable' },
  isValid: (b): b is DensityState => {
    if (typeof b !== 'object' || b === null) return false;
    const x = b as Record<string, unknown>;
    return x['density'] === 'comfortable' || x['density'] === 'compact';
  },
};

@Injectable({ providedIn: 'root' })
export class DensityService {
  readonly density = signal<Density>(readPersisted(SPEC).density);

  constructor() {
    effect(() => {
      const d = this.density();
      writePersisted(SPEC, { __schemaVersion: 1, density: d });
      document.documentElement.setAttribute('data-density', d);
    });
  }

  set(d: Density): void { this.density.set(d); }
}
