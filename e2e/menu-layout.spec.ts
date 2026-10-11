import { expect, test } from '@playwright/test';
import { daysAgo, resetUserData, seedHabit } from '@e2e/support/data';

// Classic scrollbars (headless Chromium hides them by default), which is what makes the page shift.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] }, viewport: { width: 1000, height: 600 } });

test('opening the account menu does not move or resize the page', async ({ page }) => {
  await resetUserData();

  for (let i = 0; i < 12; i++) {
    await seedHabit({ name: `Habit ${i}`, startDate: daysAgo(10) });
  }

  await page.goto('/habits');
  await expect(page.getByRole('listitem').first()).toBeVisible();

  const header = page.locator('header.top-bar');
  const before = await header.boundingBox();

  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menuitem').first()).toBeVisible();

  const after = await header.boundingBox();

  expect(Math.round(after!.width)).toBe(Math.round(before!.width));
  expect(Math.round(after!.x)).toBe(Math.round(before!.x));
});

test('opening a dialog does not move or resize the page either', async ({ page }) => {
  await page.goto('/habits');
  await expect(page.getByRole('heading', { name: 'Habits', level: 1 })).toBeVisible();

  const header = page.locator('header.top-bar');
  const before = await header.boundingBox();

  await page.getByRole('button', { name: 'New habit' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const after = await header.boundingBox();

  expect(Math.round(after!.width)).toBe(Math.round(before!.width));
});
