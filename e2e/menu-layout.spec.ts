import { expect, test } from '@playwright/test';

// Classic scrollbars (headless Chromium hides them by default), which is what makes the page shift.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] }, viewport: { width: 1000, height: 600 } });

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

test('the habit description box has a fixed size too: no resize handle', async ({ page }) => {
  await page.goto('/habits');
  await page.getByRole('button', { name: 'New habit' }).first().click();
  await expect(page.getByLabel('Description (optional)').or(page.locator('#habit-description'))).toHaveCSS(
    'resize',
    'none',
  );
});
