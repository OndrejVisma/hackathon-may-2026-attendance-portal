import { Injectable, signal } from '@angular/core';
import { User } from './user';

const USER_KEY  = 'attendance.session.user';
const TOKEN_KEY = 'attendance.session.token';

interface Persisted {
  readonly user: User;
  readonly accessToken: string;
  readonly expiresAt: number; // epoch ms
}

const readPersisted = (): Persisted | null => {
  try {
    const userRaw  = sessionStorage.getItem(USER_KEY);
    const tokenRaw = sessionStorage.getItem(TOKEN_KEY);
    if (!userRaw || !tokenRaw) return null;
    const user = JSON.parse(userRaw) as User;
    const t = JSON.parse(tokenRaw) as { accessToken: string; expiresAt: number };
    if (Date.now() > t.expiresAt) return null;
    return { user, accessToken: t.accessToken, expiresAt: t.expiresAt };
  } catch {
    return null;
  }
};

@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly _state = signal<Persisted | null>(readPersisted());

  readonly user = signal<User | null>(this._state()?.user ?? null);

  current(): User | null { return this._state()?.user ?? null; }
  accessToken(): string | null { return this._state()?.accessToken ?? null; }

  signIn(user: User, accessToken: string, expiresInSeconds: number): void {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken, expiresAt }));
    this._state.set({ user, accessToken, expiresAt });
    this.user.set(user);
  }

  signOut(): void {
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    this._state.set(null);
    this.user.set(null);
  }
}
