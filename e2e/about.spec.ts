import { expect, test } from '@playwright/test';

test('the contributors are tucked behind "friends", with the primary contributor first', async ({ page }) => {
  await page.goto('/about');

  await expect(page.getByText(/Built and maintained by/)).toBeVisible();
  await expect(page.locator('#contributors')).toHaveCount(0);

  const toggle = page.getByRole('button', { name: 'friends' });

  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  const list = page.locator('#contributors');

  await expect(list.getByText('Primary contributor')).toBeVisible();
  await expect(list.getByRole('link').first()).toHaveText('MacWeTT');
  await expect(list.getByRole('link').first()).toHaveAttribute('href', 'https://github.com/MacWeTT');
  await expect(list.getByRole('link', { name: 'Aditya Kapoor' })).toHaveAttribute(
    'href',
    'https://github.com/detoroito-sama',
  );

  await toggle.click();
  await expect(page.locator('#contributors')).toHaveCount(0);
});

test('the About page is one click from the footer', async ({ page }) => {
  await page.goto('/today');
  await page.getByRole('contentinfo').getByRole('link', { name: 'About' }).click();

  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('button', { name: 'friends' })).toBeVisible();
});

test('the footer shows the version', async ({ page }) => {
  await page.goto('/about');

  await expect(page.getByRole('contentinfo')).toContainText('Version 0.8.1');
});
