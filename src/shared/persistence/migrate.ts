// Per FE refinement §27.
// Every persisted object carries a __schemaVersion. On read we run forward
// migrations from the stored version to the current version. Migrations
// are pure functions, idempotent, individually unit-testable.
//
// On migration failure (corrupted blob, unknown version) we drop the value,
// warn, and fall back to defaults. The app never crashes on a stale entry.

import { log } from '../logging/logger';

export interface Versioned {
  readonly __schemaVersion: number;
}

export interface MigrationSpec<T extends Versioned> {
  readonly storageKey: string;
  readonly currentVersion: number;
  /** v -> v+1 migrations. Indexed by source version (0..currentVersion-1). */
  readonly migrations: ReadonlyArray<(blob: unknown) => unknown>;
  readonly defaults: T;
  /** Type guard for the final shape — runs after migrations. */
  readonly isValid: (blob: unknown) => blob is T;
}

/** Read-and-migrate. Always returns a valid T; updates storage if migrated. */
export function readPersisted<T extends Versioned>(spec: MigrationSpec<T>, storage: Storage = localStorage): T {
  let raw: string | null;
  try { raw = storage.getItem(spec.storageKey); }
  catch { return spec.defaults; }
  if (!raw) return spec.defaults;

  let blob: unknown;
  try { blob = JSON.parse(raw); }
  catch (e: unknown) {
    log.warn('persist.parse_failed', { key: spec.storageKey, err: String(e) });
    storage.removeItem(spec.storageKey);
    return spec.defaults;
  }

  let version = readVersion(blob);
  if (version > spec.currentVersion) {
    // Newer than this build — refuse to downgrade.
    log.warn('persist.newer_version', { key: spec.storageKey, version, current: spec.currentVersion });
    return spec.defaults;
  }

  let working = blob;
  while (version < spec.currentVersion) {
    const migrate = spec.migrations[version];
    if (!migrate) {
      log.warn('persist.missing_migration', { key: spec.storageKey, from: version });
      storage.removeItem(spec.storageKey);
      return spec.defaults;
    }
    try {
      working = migrate(working);
    } catch (e: unknown) {
      log.warn('persist.migration_threw', { key: spec.storageKey, from: version, err: String(e) });
      storage.removeItem(spec.storageKey);
      return spec.defaults;
    }
    version += 1;
  }

  if (!spec.isValid(working)) {
    log.warn('persist.invalid_after_migration', { key: spec.storageKey });
    storage.removeItem(spec.storageKey);
    return spec.defaults;
  }

  // Persist the migrated shape so next read is one-shot.
  try { storage.setItem(spec.storageKey, JSON.stringify(working)); } catch {/* tolerate */}
  return working;
}

export function writePersisted<T extends Versioned>(spec: MigrationSpec<T>, value: T, storage: Storage = localStorage): void {
  try {
    storage.setItem(spec.storageKey, JSON.stringify({ ...value, __schemaVersion: spec.currentVersion }));
  } catch (e: unknown) {
    log.warn('persist.write_failed', { key: spec.storageKey, err: String(e) });
  }
}

function readVersion(blob: unknown): number {
  if (typeof blob !== 'object' || blob === null) return 0;
  const v = (blob as Record<string, unknown>)['__schemaVersion'];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
