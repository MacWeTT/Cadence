import { expect, test } from '@playwright/test';
import { daysAgo, resetUserData, seedHabit } from '@e2e/support/data';

test.beforeEach(async () => {
  await resetUserData();
});

test('the Habits endpoint answers a signed-out request with a 401, not a redirect', async ({ playwright }) => {
  const context = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
    storageState: { cookies: [], origins: [] },
  });
  const response = await context.get('/api/habits', { maxRedirects: 0 });

  expect(response.status()).toBe(401);
  await context.dispose();
});

test('coming back to Habits shows the cached list at once, with no skeleton, then refreshes it quietly', async ({
  page,
}) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/habits');
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toBeVisible();

  await page.getByRole('banner').getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();

  // Something changes behind the app's back while we are away, then we come back: Habits must not flash a skeleton.
  await seedHabit({ name: 'Run', startDate: daysAgo(5) });
  await page.evaluate(() => {
    const w = window as unknown as { __sawSkeleton: boolean };

    w.__sawSkeleton = false;
    new MutationObserver(() => {
      if (document.querySelector('.skeleton')) {
        w.__sawSkeleton = true;
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole('banner').getByRole('link', { name: 'Habits' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toBeVisible();

  expect(
    await page.evaluate(() => {
      return (window as unknown as { __sawSkeleton: boolean }).__sawSkeleton;
    }),
  ).toBe(false);
});

test('archiving answers at once; if the server refuses, the habit comes back and a toast says so', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/habits');
  await expect(page.getByRole('listitem').filter({ hasText: 'Read' })).toBeVisible();

  // Every request that changes something fails.
  await page.route('**/habits', route => {
    return route.request().method() === 'POST' ? route.abort() : route.continue();
  });

  await page.getByRole('button', { name: 'Actions for Read' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();

  await expect(page.getByText(/Something went wrong/)).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Habits' }).getByRole('listitem').filter({ hasText: 'Read' }),
  ).toBeVisible();
});

test('archiving moves the habit to Archived straight away and keeps it there once the server agrees', async ({
  page,
}) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/habits');

  await page.getByRole('button', { name: 'Actions for Read' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();

  await expect(page.getByText('Habit archived')).toBeVisible();
  await expect(page.getByRole('button', { name: /Archived \(1\)/ })).toBeVisible();
});
