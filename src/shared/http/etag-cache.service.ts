import { Injectable } from '@angular/core';

// FE refinement §26 — ETag round-trip.
// Captures the ETag header of every GET keyed by full URL.
// API client services consult the cache when issuing PATCH/PUT/DELETE
// for the same URL and send `If-Match`. Avoids stale-write overwrites.

@Injectable({ providedIn: 'root' })
export class EtagCache {
  private readonly map = new Map<string, string>();

  put(url: string, etag: string | null): void {
    if (!etag) return;
    this.map.set(normaliseUrl(url), etag);
  }

  get(url: string): string | undefined {
    return this.map.get(normaliseUrl(url));
  }

  // Invalidate after a successful mutation so subsequent GET re-captures fresh.
  invalidate(url: string): void {
    this.map.delete(normaliseUrl(url));
  }
}

const normaliseUrl = (url: string): string => {
  // Strip query string + trailing slash so /absences/abc and /absences/abc?x=1 share an ETag.
  try {
    const u = new URL(url, 'http://placeholder.local');
    return u.origin + u.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
};
