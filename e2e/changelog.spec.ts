import { expect, test } from '@playwright/test';

test("the footer's What's new link opens the changelog: a card for each version line, and what is coming", async ({
  page,
}) => {
  await page.goto('/habits');
  await page.getByRole('contentinfo').getByRole('link', { name: "What's new" }).click();

  await expect(page).toHaveURL(/\/changelog$/);
  await expect(page.getByRole('heading', { name: "What's new", level: 1 })).toBeVisible();
  await expect(page).toHaveTitle("What's new · Cadence");

  await expect(page.getByRole('region', { name: 'Coming soon' })).toContainText('Reminders');
  await expect(page.getByRole('region', { name: 'Known issues' })).toHaveCount(0); // none listed: the card is hidden

  // The newest line is the big card: its highlights, and the notes of its latest release.
  const newest = page.getByRole('region', { name: 'Version 0.8', exact: true });

  await expect(newest).toContainText('Your profile, your sounds');
  await expect(newest).toContainText('Latest: 0.8.5');
  await expect(newest).toContainText('A new look for What');

  // The older lines are cards with their highlights, and no card of their own for a patch.
  await expect(page.getByRole('region', { name: 'Version 0.7', exact: true })).toContainText('Focus on a habit');
  await expect(page.getByRole('region', { name: 'Version 0.6', exact: true })).toContainText('Install Cadence');
  await expect(page.getByRole('region', { name: 'Version 0.5', exact: true })).toContainText('Links on a habit');
  await expect(page.getByRole('region', { name: 'Version 0.4', exact: true })).toContainText('Pages open instantly');
  await expect(page.getByRole('region', { name: 'Version 0.3', exact: true })).toContainText('contact form');
  await expect(page.getByRole('region', { name: 'Version 0.8.5', exact: true })).toHaveCount(0);
});

test('See every change opens every release in full, and a line card leads to its own releases', async ({ page }) => {
  await page.goto('/changelog');
  await page.getByRole('link', { name: 'See every change' }).click();

  await expect(page).toHaveURL(/\/changelog\/all$/);
  await expect(page.getByRole('heading', { name: 'Every change', level: 1 })).toBeVisible();
  await expect(page).toHaveTitle('Every change · Cadence');

  await expect(page.getByRole('region', { name: 'Version 0.7.0' })).toContainText('Focus on a habit');
  await expect(page.getByRole('region', { name: 'Version 0.6.3' })).toContainText('fits phones and tablets');
  await expect(page.getByRole('region', { name: 'Version 0.6.0' })).toContainText('Install Cadence');
  await expect(page.getByRole('region', { name: 'Version 0.5.0' })).toContainText('Links on a habit');
  await expect(page.getByRole('region', { name: 'Version 0.4.0' })).toContainText('Pages open instantly');
  await expect(page.getByRole('region', { name: 'Version 0.3.6' })).toContainText('A contact form');

  const release = page.getByRole('region', { name: 'Version 0.3.5' });

  await expect(release).toContainText('Every page moves in smoothly');
  await expect(release).toContainText('2026-10-11');
  await expect(page.getByRole('region', { name: 'Version 0.3.0' })).toBeVisible();

  await page.getByRole('link', { name: "Back to What's new" }).click();
  await expect(page).toHaveURL(/\/changelog$/);

  await page
    .getByRole('region', { name: 'Version 0.7', exact: true })
    .getByRole('link', { name: 'All 0.7 changes' })
    .click();
  await expect(page).toHaveURL(/\/changelog\/all#changelog-0\.7\.0$/);
  await expect(page.getByRole('heading', { name: 'Version 0.7.0' })).toBeInViewport();
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
