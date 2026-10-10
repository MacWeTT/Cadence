import { expect, test } from '@playwright/test';

test('every app page ends with a footer: about, contact and who built it', async ({ page }) => {
  await page.goto('/habits');

  const footer = page.getByRole('contentinfo');

  await expect(footer.getByRole('link', { name: 'About' })).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', /github\.com\/MacWeTT/);
  await expect(footer.getByRole('link', { name: 'MacWeTT' })).toBeVisible();
  await expect(footer).toContainText('Developed by MacWeTT');
});

test('the About link opens the about page', async ({ page }) => {
  await page.goto('/today');
  await page.getByRole('contentinfo').getByRole('link', { name: 'About' }).click();

  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { name: 'About Cadence', level: 1 })).toBeVisible();
});
