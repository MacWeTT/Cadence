import { expect, test } from '@playwright/test';

test("the footer's What's new link opens the changelog: what each release added and what is coming", async ({
  page,
}) => {
  await page.goto('/habits');
  await page.getByRole('contentinfo').getByRole('link', { name: "What's new" }).click();

  await expect(page).toHaveURL(/\/changelog$/);
  await expect(page.getByRole('heading', { name: "What's new", level: 1 })).toBeVisible();
  await expect(page).toHaveTitle("What's new · Cadence");

  const coming = page.getByRole('region', { name: 'Coming soon' });

  await expect(coming).toContainText('Focus sessions');
  await expect(page.getByRole('region', { name: 'Known issues' })).toHaveCount(0); // none listed: the card is hidden

  await expect(page.getByRole('region', { name: 'Version 0.6.3' })).toContainText('Install Cadence');
  await expect(page.getByRole('region', { name: 'Version 0.5.0' })).toContainText('Links on a habit');
  await expect(page.getByRole('region', { name: 'Version 0.4.0' })).toContainText('Pages open instantly');
  await expect(page.getByRole('region', { name: 'Version 0.3.6' })).toContainText('A contact form');

  const release = page.getByRole('region', { name: 'Version 0.3.5' });

  await expect(release).toContainText('Every page moves in smoothly');
  await expect(release).toContainText('2026-10-11');
  await expect(page.getByRole('region', { name: 'Version 0.3.0' })).toBeVisible();
});

test('a dot on the link marks a version not seen yet, and goes once the page has been opened', async ({ page }) => {
  await page.goto('/habits');

  const link = page.getByRole('contentinfo').getByRole('link', { name: "What's new" });

  await expect(link.locator('.whats-new-link__dot')).toBeVisible();
  await link.click();
  await expect(page.getByRole('heading', { name: "What's new", level: 1 })).toBeVisible();
  await page.goto('/habits');
  await expect(link).toBeVisible();
  await expect(link.locator('.whats-new-link__dot')).toHaveCount(0);
});
