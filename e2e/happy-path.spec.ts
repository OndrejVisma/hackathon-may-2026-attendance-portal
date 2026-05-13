import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Happy path covering employee.feature + manager.feature core scenarios,
// run against the live mock server (docker compose up in
// dev-extras/integration/mock-server before running this spec).

const SEEDED = {
  anna:  { id: 'u-ic-anna',       label: 'Anna Mrkvička' },
  lead:  { id: 'u-lead-platform', label: 'Peter Kováč' },
  hr:    { id: 'u-hr',            label: 'Lucia Tichá' },
  admin: { id: 'u-admin',         label: 'Karol Veľký' },
};

async function signInAs(page: Page, label: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: new RegExp(label) }).click();
  // Privacy notice (§38) — acknowledge on first sign-in.
  const accept = page.getByRole('button', { name: /I accept and continue/i });
  if (await accept.isVisible({ timeout: 1500 }).catch(() => false)) {
    await accept.click();
  }
}

async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking, JSON.stringify(blocking.map(v => v.id), null, 2)).toEqual([]);
}

test.describe('Happy path', () => {
  test('Anna submits vacation; manager approves it; HR reviews queue', async ({ browser }) => {
    // 1) Anna signs in, lands on /me.
    const annaCtx = await browser.newContext();
    const anna = await annaCtx.newPage();
    await signInAs(anna, SEEDED.anna.label);
    await expect(anna).toHaveURL(/\/me$/);
    await expect(anna.getByRole('heading', { name: /(My day|Môj deň)/ })).toBeVisible();

    // 2) Anna submits a new vacation (drafts a request).
    await anna.getByRole('link', { name: /(New absence|Nová absencia)/ }).click();
    await expect(anna).toHaveURL(/\/absences\/new$/);
    await anna.getByLabel(/From/i).fill('2026-09-07');
    await anna.getByLabel(/^To/i).fill('2026-09-11');
    await anna.getByRole('button', { name: /^(Save|Uložiť)/ }).click();
    await expect(anna).toHaveURL(/\/me$/);

    // 3) Anna sees her new pending absence in the list (filter chip 'Pending').
    await anna.getByRole('tab', { name: /Pending/i }).click();
    await expect(anna.getByText(/2026-09-07/)).toBeVisible();
    await expectNoA11yViolations(anna);

    // 4) Manager signs in another context and sees Anna's request routed to him.
    const mgrCtx = await browser.newContext();
    const mgr = await mgrCtx.newPage();
    await signInAs(mgr, SEEDED.lead.label);
    await mgr.getByRole('link', { name: /(Approvals|Schválenia)/ }).click();
    await expect(mgr).toHaveURL(/\/approvals$/);
    const annasRow = mgr.locator('li', { hasText: /Anna Mrkvička/i }).first();
    await expect(annasRow).toBeVisible();

    // 5) Manager cannot approve their own request — verify self-approval guard
    //    is exposed in the UI (no Approve button on rows belonging to the manager).
    const ownRow = mgr.locator('li', { hasText: SEEDED.lead.label });
    if (await ownRow.count() > 0) {
      await expect(ownRow.first().getByRole('button', { name: /^(Approve|Schváliť)/ })).toHaveCount(0);
    }

    // 6) Manager approves Anna's request.
    await annasRow.getByRole('button', { name: /^(Approve|Schváliť)/ }).click();
    await expect(mgr.getByText(/Approved/i)).toBeVisible({ timeout: 5000 });

    // 7) HR opens the documents queue (smoke — there's a paragraph in the seed).
    const hrCtx = await browser.newContext();
    const hr = await hrCtx.newPage();
    await signInAs(hr, SEEDED.hr.label);
    await hr.getByRole('link', { name: /(HR|^HR$)/ }).click();
    await expect(hr).toHaveURL(/\/hr$/);
    await expect(hr.getByRole('tab', { name: /Documents/i })).toHaveAttribute('aria-selected', 'true');

    // Each context cleans up its own privacy-notice localStorage on close.
    await annaCtx.close();
    await mgrCtx.close();
    await hrCtx.close();
  });

  test('Locale switch flips topbar copy without page reload', async ({ page }) => {
    await signInAs(page, SEEDED.anna.label);
    await expect(page.getByRole('link', { name: 'Môj deň' })).toBeVisible();
    await page.getByRole('button', { name: /Locale:/ }).click();
    await expect(page.getByRole('link', { name: 'My day' })).toBeVisible();
  });
});
