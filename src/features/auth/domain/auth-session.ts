import { Injectable, signal } from '@angular/core';
import { User } from './user';

const STORAGE_KEY = 'attendance.session.user';

const readPersisted = (): User | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly _user = signal<User | null>(readPersisted());

  readonly user = this._user.asReadonly();

  current(): User | null {
    return this._user();
  }

  signIn(user: User): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  signOut(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this._user.set(null);
  }
}
