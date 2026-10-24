import { expect, test } from '@playwright/test';

test('an address that does not exist shows a Cadence page with a way back, and says 404', async ({ page }) => {
  const response = await page.goto('/no-such-page');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: "That page isn't here" })).toBeVisible();
  await expect(page).toHaveTitle(/Not found/);

  await page.getByRole('link', { name: 'Back to Cadence' }).click();
  await expect(page).toHaveURL(/\/$|\/today$/);
});

test('a signed-out visitor gets the same page for a missing address', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();

  await page.goto('/auth/desktop-not-a-page');
  await expect(page.getByRole('heading', { name: "That page isn't here" })).toBeVisible();
  await context.close();
});
