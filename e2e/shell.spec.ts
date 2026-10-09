import { expect, test } from '@playwright/test';

test.use({ colorScheme: 'light' });

test('today page shows the heading and top-bar navigation', async ({ page }) => {
  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  const nav = page.getByRole('banner');
  for (const name of ['Today', 'Habits', 'Progress']) {
    await expect(nav.getByRole('link', { name })).toBeVisible();
  }
});

test('theme toggle switches to dark and persists after reload', async ({ page }) => {
  await page.goto('/today');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
