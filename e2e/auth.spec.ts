import { expect, test } from '@playwright/test';

test.use({ colorScheme: 'light', storageState: { cookies: [], origins: [] } });

for (const path of ['/today', '/habits', '/progress']) {
  test(`unauthenticated visit to ${path} lands on the login page`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });
}

test('theme toggle switches to dark and persists after reload', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('the theme button flips both ways and the transition class does not linger', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
});
