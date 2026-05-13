import { test, expect, Page } from '@playwright/test';

// FE refinement §19.5 — Visual regression.
// Captures pixel-diff baselines for the smoke routes in both themes.
// First run produces a baseline. Subsequent runs fail on per-pixel drift
// above the tolerance below. Update baselines via `npx playwright test --update-snapshots`.

const SEEDED = {
  anna: { id: 'u-ic-anna', label: 'Anna Mrkvička' },
};

async function signIn(page: Page, label: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: new RegExp(label) }).click();
  const accept = page.getByRole('button', { name: /I accept and continue/i });
  if (await accept.isVisible({ timeout: 1500 }).catch(() => false)) await accept.click();
  // Dismiss onboarding tour so baselines are stable across runs.
  const dismiss = page.getByRole('button', { name: /Don't show again|Got it/ });
  if (await dismiss.isVisible({ timeout: 1500 }).catch(() => false)) await dismiss.click();
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('attendance.theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

const ROUTES: ReadonlyArray<{ path: string; name: string }> = [
  { path: '/login',         name: 'login' },
  { path: '/me',            name: 'my-day' },
  { path: '/balances',      name: 'balances' },
  { path: '/notifications', name: 'notifications' },
  { path: '/absences/new',  name: 'absence-form' },
];

test.describe('Visual regression — light theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await setTheme(page, 'light');
    await signIn(page, SEEDED.anna.label);
  });

  for (const r of ROUTES.filter((x) => x.path !== '/login')) {
    test(`${r.name} (light)`, async ({ page }) => {
      await page.goto(r.path);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`${r.name}-light.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
      });
    });
  }
});

test.describe('Visual regression — dark theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await setTheme(page, 'dark');
    await signIn(page, SEEDED.anna.label);
  });

  for (const r of ROUTES.filter((x) => x.path !== '/login')) {
    test(`${r.name} (dark)`, async ({ page }) => {
      await page.goto(r.path);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`${r.name}-dark.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
        animations: 'disabled',
      });
    });
  }
});

test('login screen (light + dark) without sign-in', async ({ page }) => {
  await setTheme(page, 'light');
  await page.goto('/login');
  await expect(page).toHaveScreenshot('login-light.png', { fullPage: true, maxDiffPixelRatio: 0.01 });
  await setTheme(page, 'dark');
  await page.reload();
  await expect(page).toHaveScreenshot('login-dark.png', { fullPage: true, maxDiffPixelRatio: 0.01 });
});
