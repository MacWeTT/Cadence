import { expect, test } from '@playwright/test';
import { daysAgo, resetUserData, seedCompletion, seedHabit } from '@e2e/support/data';

test.beforeEach(async () => {
  await resetUserData();
});

const watchForSkeleton = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => {
    const w = window as unknown as { __sawSkeleton: boolean };

    w.__sawSkeleton = false;
    new MutationObserver(() => {
      if (document.querySelector('.skeleton')) {
        w.__sawSkeleton = true;
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
};

const sawSkeleton = (page: import('@playwright/test').Page) => {
  return page.evaluate(() => {
    return (window as unknown as { __sawSkeleton: boolean }).__sawSkeleton;
  });
};

test('the Progress endpoint answers a signed-out request with a 401', async ({ playwright }) => {
  const context = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
    storageState: { cookies: [], origins: [] },
  });

  expect((await context.get('/api/progress', { maxRedirects: 0 })).status()).toBe(401);
  await context.dispose();
});

test('coming back to Progress shows the cached page at once, with no skeleton', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(10) });
  await page.goto('/progress');
  await expect(page.getByRole('region', { name: /Completion, last 30 days/ })).toBeVisible();

  await page.getByRole('banner').getByRole('link', { name: 'Habits' }).click();
  await expect(page.getByRole('heading', { name: 'Habits', level: 1 })).toBeVisible();

  await watchForSkeleton(page);
  await page.getByRole('banner').getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByRole('region', { name: /Completion, last 30 days/ })).toBeVisible();

  expect(await sawSkeleton(page)).toBe(false);
});

test('a tick made on Today shows on Progress without a reload', async ({ page }) => {
  const read = await seedHabit({ name: 'Read', startDate: daysAgo(10) });

  await seedCompletion(read, daysAgo(1));
  await page.goto('/progress');
  await expect(page.getByRole('region', { name: /Completion, last 30 days/ })).toContainText('🔥 1 day');

  await page.getByRole('banner').getByRole('link', { name: 'Today' }).click();
  await page.getByRole('checkbox', { name: 'Mark Read done' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Read not done' })).toBeVisible();

  await page.getByRole('banner').getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByRole('region', { name: /Completion, last 30 days/ })).toContainText('🔥 2 days');
});
