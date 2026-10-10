import { expect, test } from '@playwright/test';
import { daysAgo, resetUserData, seedCompletion, seedHabit } from './support/data';

test.beforeEach(async () => {
  await resetUserData();
});

test('with no habits it invites you to create one', async ({ page }) => {
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: 'Nothing to show yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create a habit' })).toHaveAttribute('href', '/habits');
});

test('shows streaks, the rate and the heatmap, and narrows to one habit', async ({ page }) => {
  const read = await seedHabit({ name: 'Read', startDate: daysAgo(10) });
  await seedHabit({ name: 'Run', startDate: daysAgo(10) });
  await seedCompletion(read, daysAgo(1));
  await seedCompletion(read, daysAgo(2));
  await page.goto('/progress');

  const rates = page.getByRole('region', { name: /Completion, last 30 days/ });
  await expect(rates).toContainText('2 of 20 done'); // 10 closed days x 2 habits
  await expect(rates.getByRole('listitem').filter({ hasText: 'Read' })).toContainText('🔥 2 days');
  await expect(rates.getByRole('listitem').filter({ hasText: 'Read' })).toContainText('Best 2 days');
  await expect(rates.getByRole('listitem').filter({ hasText: 'Run' })).toContainText('No streak');
  await expect(page.getByTitle(/: 1 of 2 done$/)).toHaveCount(2); // the two days Read was ticked

  await page.getByRole('link', { name: 'Read', exact: true }).click();
  await expect(page).toHaveURL(/habit=/);
  await expect(page.getByRole('link', { name: 'Read', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(rates.getByRole('listitem').filter({ hasText: 'Run' })).toHaveCount(0);
  await expect(page.getByTitle(/: done$/)).toHaveCount(2);
  await expect(rates).toContainText('2 of 10 done');
});

test('the period buttons change the rate window', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(10) });
  await page.goto('/progress');
  await page.getByRole('link', { name: '7d' }).click();
  await expect(page).toHaveURL(/range=7/);
  await expect(page.getByRole('region', { name: /Completion, last 7 days/ })).toContainText('0 of 7 done');
  await expect(page.getByRole('link', { name: '7d' })).toHaveAttribute('aria-current', 'page');
});

test('an unknown habit or period in the address falls back to the defaults', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(3) });
  const response = await page.goto('/progress?habit=nope&range=5');
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole('region', { name: /Completion, last 30 days/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'All habits' })).toHaveAttribute('aria-current', 'page');
});

test('the year heatmap fits its card without a scrollbar', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(300) });
  for (const width of [1127, 1400]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/progress');
    const heatmap = page.getByRole('img', { name: 'Activity over the past year' });
    await expect(heatmap).toBeVisible();
    expect(await heatmap.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
