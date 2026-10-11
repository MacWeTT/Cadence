import { expect, test } from '@playwright/test';
import { daysAgo, resetUserData, seedHabit, setWeekStartForTests } from '@e2e/support/data';

test.beforeEach(async () => {
  await resetUserData();
  await setWeekStartForTests();
});

test('the Home endpoint answers a signed-out request with a 401', async ({ playwright }) => {
  const context = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
    storageState: { cookies: [], origins: [] },
  });

  expect((await context.get('/api/home', { maxRedirects: 0 })).status()).toBe(401);
  await context.dispose();
});

test('coming back to Home shows the cached page at once, with no skeleton', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/');
  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();

  await page.getByRole('banner').getByRole('link', { name: 'Habits' }).click();
  await expect(page.getByRole('heading', { name: 'Habits', level: 1 })).toBeVisible();

  await page.evaluate(() => {
    const w = window as unknown as { __sawSkeleton: boolean };

    w.__sawSkeleton = false;
    new MutationObserver(() => {
      if (document.querySelector('.skeleton')) {
        w.__sawSkeleton = true;
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole('banner').getByRole('link', { name: 'Cadence' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();

  expect(await page.evaluate(() => {return (window as unknown as { __sawSkeleton: boolean }).__sawSkeleton})).toBe(false);
});

test('a tick on Home is already there when you open Today', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/today');
  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();

  await page.getByRole('banner').getByRole('link', { name: 'Cadence' }).click();
  await page.getByRole('checkbox', { name: 'Mark Read done' }).click();
  await expect(page.getByRole('checkbox', { name: 'Mark Read not done' })).toBeVisible();

  await page.getByRole('banner').getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('list', { name: 'Done today' }).getByRole('listitem')).toContainText('Read');
});

test('a tick that fails on Home goes back and says so', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/');
  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();

  await page.route(url => {return new URL(url).pathname === '/'}, route => {
    return route.request().method() === 'POST' ? route.abort() : route.continue();
  });
  await page.getByRole('checkbox', { name: 'Mark Read done' }).click();

  await expect(page.getByText(/Couldn't save that/)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();
});
