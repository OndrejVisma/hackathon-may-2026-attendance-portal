import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Smoke', () => {
  test('mock-login page renders, no a11y violations', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Mock login' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Anna Novakova/ })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });

  test('signing in as Anna lands on My day', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Anna Novakova/ }).click();
    await expect(page.getByRole('heading', { name: 'My day' })).toBeVisible();
  });
});
