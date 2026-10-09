import { expect, test } from '@playwright/test';

test('signed-in /today shows the heading, the navigation and the account menu', async ({ page }) => {
  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  const nav = page.getByRole('banner');
  for (const name of ['Today', 'Habits', 'Progress']) {
    await expect(nav.getByRole('link', { name })).toBeVisible();
  }
  await expect(page.getByLabel('Account menu')).toBeVisible();
});
