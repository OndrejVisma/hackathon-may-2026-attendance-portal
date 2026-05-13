import { Injectable, signal } from '@angular/core';

export interface Toast {
  readonly id: string;
  readonly kind: 'info' | 'success' | 'warning' | 'error';
  readonly message: string;
  readonly createdAt: number;
}

const DURATION_MS: Record<Toast['kind'], number> = {
  info: 4_000,
  success: 4_000,
  warning: 7_000,
  error: 0, // sticky until dismissed
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<readonly Toast[]>([]);

  show(kind: Toast['kind'], message: string): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = { id, kind, message, createdAt: Date.now() };
    this.toasts.update((cur) => [toast, ...cur].slice(0, 3));
    const ttl = DURATION_MS[kind];
    if (ttl > 0) setTimeout(() => this.dismiss(id), ttl);
  }

  dismiss(id: string): void {
    this.toasts.update((cur) => cur.filter((t) => t.id !== id));
  }

  info   (m: string): void { this.show('info', m); }
  success(m: string): void { this.show('success', m); }
  warn   (m: string): void { this.show('warning', m); }
  error  (m: string): void { this.show('error', m); }
}
