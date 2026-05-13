import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from './api-config';

type Params = Readonly<Record<string, string | number | boolean | null | undefined>>;

const toHttpParams = (p?: Params): HttpParams => {
  let h = new HttpParams();
  if (!p) return h;
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined) continue;
    h = h.set(k, String(v));
  }
  return h;
};

const newIdempotencyKey = (): string => {
  // UUID v4-ish — enough for hackathon retries; not cryptographically strong.
  const r = (n: number): string => Math.random().toString(16).slice(2, 2 + n);
  return `${r(8)}-${r(4)}-${r(4)}-${r(4)}-${r(12)}`;
};

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }

  get<T>(path: string, params?: Params): Observable<T> {
    return this.http.get<T>(this.url(path), { params: toHttpParams(params) });
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? {}, {
      headers: { 'Idempotency-Key': newIdempotencyKey(), ...(headers ?? {}) },
    });
  }

  patch<T>(path: string, body?: unknown, ifMatch?: string): Observable<T> {
    const headers: Record<string, string> = { 'Idempotency-Key': newIdempotencyKey() };
    if (ifMatch) headers['If-Match'] = ifMatch;
    return this.http.patch<T>(this.url(path), body ?? {}, { headers });
  }

  delete<T>(path: string, ifMatch?: string): Observable<T> {
    const headers: Record<string, string> = { 'Idempotency-Key': newIdempotencyKey() };
    if (ifMatch) headers['If-Match'] = ifMatch;
    return this.http.delete<T>(this.url(path), { headers });
  }

  upload<T>(path: string, file: File): Observable<T> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<T>(this.url(path), fd, {
      headers: { 'Idempotency-Key': newIdempotencyKey() },
    });
  }
}
