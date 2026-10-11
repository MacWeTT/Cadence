import { expect, test } from '@playwright/test';
import { daysAgo, resetUserData, seedHabit, setWeekStartForTests } from '@e2e/support/data';

test.beforeEach(async () => {
  await resetUserData();
  await setWeekStartForTests();
});

test('the Today endpoint answers a signed-out request with a 401', async ({ playwright }) => {
  const context = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
    storageState: { cookies: [], origins: [] },
  });

  expect((await context.get('/api/today', { maxRedirects: 0 })).status()).toBe(401);
  await context.dispose();
});

test('coming back to Today shows the cached day at once, with no skeleton', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/today');
  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();

  await page.getByRole('banner').getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByRole('region', { name: /Completion/ })).toBeVisible(); // Progress has finished loading

  await page.evaluate(() => {
    const w = window as unknown as { __sawSkeleton: boolean };

    w.__sawSkeleton = false;
    new MutationObserver(() => {
      if (document.querySelector('.skeleton')) {
        w.__sawSkeleton = true;
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole('banner').getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();

  expect(
    await page.evaluate(() => {
      return (window as unknown as { __sawSkeleton: boolean }).__sawSkeleton;
    }),
  ).toBe(false);
});

test('yesterday opens at once from the arrow: it was fetched while today was read', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/today');
  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();
  await page.waitForTimeout(800); // the neighbouring days are fetched in the background

  await page.evaluate(() => {
    const w = window as unknown as { __sawSkeleton: boolean };

    w.__sawSkeleton = false;
    new MutationObserver(() => {
      if (document.querySelector('.skeleton')) {
        w.__sawSkeleton = true;
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole('link', { name: 'Previous day' }).click();
  await expect(page).toHaveURL(/date=/);
  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();

  expect(
    await page.evaluate(() => {
      return (window as unknown as { __sawSkeleton: boolean }).__sawSkeleton;
    }),
  ).toBe(false);
});

test('a tick shows in the cache at once, and Today and its day agree after leaving and coming back', async ({
  page,
}) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/today');
  await page.getByRole('checkbox', { name: 'Mark Read done' }).click();
  await expect(page.getByRole('list', { name: 'Done today' }).getByRole('listitem')).toContainText('Read');

  await page.getByRole('banner').getByRole('link', { name: 'Habits' }).click();
  await page.getByRole('banner').getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('list', { name: 'Done today' }).getByRole('listitem')).toContainText('Read');
});
