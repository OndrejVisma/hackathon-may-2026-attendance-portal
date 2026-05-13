import { Injectable, effect, signal } from '@angular/core';
import { CATALOGUES, Locale } from './catalogue';

const STORAGE_KEY = 'attendance.locale';

const readPersisted = (): Locale => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'en' || raw === 'sk' ? raw : 'sk';
};

// Minimal ICU plural support: {count, plural, one {…} other {…}}
// Per FE refinement §6 — handles SK + EN plural rules adequately for hackathon.
const pluralRules: Record<Locale, (n: number) => 'one' | 'few' | 'other'> = {
  sk: (n) => (n === 1 ? 'one' : n >= 2 && n <= 4 ? 'few' : 'other'),
  en: (n) => (n === 1 ? 'one' : 'other'),
};

const interpolate = (template: string, params: Readonly<Record<string, string | number>>, locale: Locale): string => {
  // Simple {key} substitution + {count, plural, one {one item} other {# items}}
  return template
    .replace(/\{(\w+),\s*plural,\s*([^}]+?)\s*\}/g, (_match, key: string, body: string) => {
      const n = Number(params[key]);
      if (!Number.isFinite(n)) return '';
      const cat = pluralRules[locale](n);
      const cases: Record<string, string> = {};
      const re = /(one|few|other)\s*\{([^}]*)\}/g;
      for (let m: RegExpExecArray | null; (m = re.exec(body));) {
        const [, k, v] = m as unknown as [string, string, string];
        cases[k] = v;
      }
      const chosen = cases[cat] ?? cases['other'] ?? '';
      return chosen.replace('#', String(n));
    })
    .replace(/\{(\w+)\}/g, (_, key: string) => {
      const v = params[key];
      return v === undefined ? `{${key}}` : String(v);
    });
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<Locale>(readPersisted());

  constructor() {
    effect(() => {
      const l = this.locale();
      localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    });
  }

  t(key: string, params?: Readonly<Record<string, string | number>>): string {
    const cat = CATALOGUES[this.locale()];
    const tmpl = cat[key] ?? CATALOGUES.sk[key] ?? key;
    return params ? interpolate(tmpl, params, this.locale()) : tmpl;
  }

  set(locale: Locale): void { this.locale.set(locale); }
}
