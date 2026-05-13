import { Injectable, effect, signal } from '@angular/core';

type Preference = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'attendance.theme';

const readPersisted = (): Preference => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
};

const systemPrefersDark = (): boolean =>
  window.matchMedia('(prefers-color-scheme: dark)').matches;

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly preference = signal<Preference>(readPersisted());

  constructor() {
    effect(() => {
      const pref = this.preference();
      localStorage.setItem(STORAGE_KEY, pref);
      this.applyToDom(pref);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.preference() === 'system') this.applyToDom('system');
    });
  }

  set(pref: Preference): void {
    this.preference.set(pref);
  }

  private applyToDom(pref: Preference): void {
    const root = document.documentElement;
    const effective = pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
    root.setAttribute('data-theme', effective);
  }
}
