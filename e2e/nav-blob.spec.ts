import { expect, test } from '@playwright/test';

const blob = '.nav-link__blob';

test('the top bar has one soft highlight, behind the link of the page you are on', async ({ page }) => {
  await page.goto('/today');

  const nav = page.locator('header.top-bar');

  await expect(nav.locator(blob)).toHaveCount(1);
  await expect(nav.getByRole('link', { name: 'Today' }).locator(blob)).toHaveCount(1);

  await nav.getByRole('link', { name: 'Habits' }).click();
  await expect(page).toHaveURL(/\/habits$/);
  await expect(nav.locator(blob)).toHaveCount(1);
  await expect(nav.getByRole('link', { name: 'Habits' }).locator(blob)).toHaveCount(1);
});

test('on Home the highlight sits behind the logo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header.top-bar a[href="/"]').locator(blob)).toHaveCount(1);
  await expect(page.locator('header.top-bar').locator(blob)).toHaveCount(1);
});

test('the footer has its own highlight on About and What is new, and the top bar has none there', async ({ page }) => {
  const footer = page.getByRole('contentinfo');

  await page.goto('/about');
  await expect(footer.locator(blob)).toHaveCount(1);
  await expect(footer.getByRole('link', { name: 'About' }).locator(blob)).toHaveCount(1);
  await expect(page.locator('header.top-bar').locator(blob)).toHaveCount(0);

  await footer.getByRole('link', { name: "What's new" }).click();
  await expect(page).toHaveURL(/\/changelog$/);
  await expect(footer.locator(blob)).toHaveCount(1);
  await expect(footer.getByRole('link', { name: /What's new/ }).locator(blob)).toHaveCount(1);
});

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the highlight glides to the next link and settles on it', async ({ page }) => {
    await page.addInitScript(() => {
      return window.sessionStorage.setItem('cadence:splash', '1');
    });
    await page.goto('/today');

    const nav = page.locator('header.top-bar');

    await nav.getByRole('link', { name: 'Progress' }).click();
    await expect(page).toHaveURL(/\/progress$/);

    const link = await nav.getByRole('link', { name: 'Progress' }).boundingBox();

    await expect(async () => {
      const box = await nav.locator(blob).boundingBox();

      expect(Math.abs(box!.x - link!.x)).toBeLessThan(2);
      expect(Math.abs(box!.width - link!.width)).toBeLessThan(2);
    }).toPass({ timeout: 5000 });
  });
});
