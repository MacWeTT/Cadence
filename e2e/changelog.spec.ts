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

  // The newest line is the big card: its headline and highlights.
  const newest = page.getByRole('region', { name: 'Version 1.0', exact: true });

  await expect(newest).toContainText('Cadence for Windows, and Circles');
  await expect(newest).toContainText('A Windows app');

  // The newest release is a run of fixes: its card shows the three biggest, and a window has the complete list.
  const update = page.getByRole('region', { name: 'Latest update: 1.0.12' });

  await expect(update).toContainText('Fixes and polish');
  await expect(update.getByRole('listitem')).toHaveCount(3);
  await expect(update).not.toContainText('Show password');
  await update.getByRole('button', { name: /^See all \d+ changes$/ }).click();

  const all = page.getByRole('dialog', { name: 'Version 1.0.12' });

  await expect(all).toContainText('Show password');
  await expect(all.getByRole('listitem').count()).resolves.toBeGreaterThan(3);
  await page.keyboard.press('Escape');

  // The versions before 1.0 are pre-releases: one card here, and their own page. No card for a patch.
  await expect(page.getByRole('region', { name: 'Pre-releases' })).toContainText('from 0.3 to 0.8');
  await expect(page.getByRole('region', { name: 'Version 0.8', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Version 1.0.0', exact: true })).toHaveCount(0);
});

test('the pre-releases have a page of their own, with a card for each version before 1.0', async ({ page }) => {
  await page.goto('/changelog');
  await page.waitForLoadState('networkidle'); // a link clicked before the page has started up is ignored
  await page.getByRole('link', { name: 'See the pre-releases' }).click();

  await expect(page).toHaveURL(/\/changelog\/pre-releases$/);
  await expect(page.getByRole('heading', { name: 'Pre-releases', level: 1 })).toBeVisible();
  await expect(page).toHaveTitle('Pre-releases · Cadence');

  await expect(page.getByRole('region', { name: 'Version 0.8', exact: true })).toContainText(
    'Your profile, your sounds',
  );
  await expect(page.getByRole('region', { name: 'Version 0.7', exact: true })).toContainText('Focus on a habit');
  await expect(page.getByRole('region', { name: 'Version 0.6', exact: true })).toContainText('Install Cadence');
  await expect(page.getByRole('region', { name: 'Version 0.5', exact: true })).toContainText('Links on a habit');
  await expect(page.getByRole('region', { name: 'Version 0.4', exact: true })).toContainText('Pages open instantly');
  await expect(page.getByRole('region', { name: 'Version 0.3', exact: true })).toContainText('contact form');
  await expect(page.getByRole('region', { name: 'Version 0.8.5', exact: true })).toHaveCount(0);
});

test('"All changes" of a version opens just that version\'s notes in a window, and leaves the page where it is', async ({
  page,
}) => {
  await page.goto('/changelog/pre-releases');
  await page
    .getByRole('region', { name: 'Version 0.6', exact: true })
    .getByRole('button', { name: 'All 0.6 changes' })
    .click();

  const notes = page.getByRole('dialog', { name: 'Version 0.6' });

  // Each release of the version is a tab, the newest first; one release's notes show at a time.
  await expect(notes).toBeVisible();
  await expect(notes.getByRole('tab', { name: '0.6.3' })).toHaveAttribute('aria-selected', 'true');
  await expect(notes).toContainText('fits phones and tablets');
  await expect(notes).not.toContainText('Install Cadence'); // that is 0.6.0, on its own tab
  await notes.getByRole('tab', { name: '0.6.0' }).click();
  await expect(notes).toContainText('Install Cadence');
  await expect(notes).not.toContainText('Focus on a habit'); // that is 0.7, a different version
  await expect(page).toHaveURL(/\/changelog\/pre-releases$/);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('See every change opens every release in full, newest first', async ({ page }) => {
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
