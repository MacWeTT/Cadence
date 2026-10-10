import { expect, test, type Page } from '@playwright/test';
import { daysAgo, getCompletions, resetUserData, seedCompletion, seedHabit } from './support/data';

test.beforeEach(async () => {
  await resetUserData();
});

const prev = (page: Page) => page.getByRole('link', { name: 'Previous day' });
const next = (page: Page) => page.getByRole('link', { name: 'Next day' });
const todayLink = (page: Page) => page.getByRole('link', { name: 'Today', exact: true }).and(page.locator('main a'));
const done = (page: Page) => page.getByRole('list', { name: 'Done', exact: true });
const doneToday = (page: Page) => page.getByRole('list', { name: 'Done today' });
const todo = (page: Page) => page.getByRole('list', { name: 'To do' });
const check = (page: Page, name: string) => page.getByRole('checkbox', { name: `Mark ${name} done` });

test('the arrows walk back to the start date and stop there; Today brings you back', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(3) });
  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  await expect(next(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(todayLink(page)).toHaveCount(0);

  for (const n of [1, 2, 3]) {
    await prev(page).click();
    await expect(page).toHaveURL(new RegExp(`date=${daysAgo(n)}$`));
  }
  await expect(prev(page)).toHaveAttribute('aria-disabled', 'true'); // at the start date
  await expect(next(page)).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toHaveCount(0);

  await todayLink(page).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
});

test('ticking yesterday persists after a reload', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto(`/today?date=${daysAgo(1)}`);
  await check(page, 'Read').click();
  await expect.poll(async () => (await getCompletions(id)).map((c) => c.completion_date)).toEqual([daysAgo(1)]);
  await page.reload();
  await expect(done(page).getByRole('listitem').filter({ hasText: 'Read' })).toBeVisible();
});

for (const bad of ['2999-01-01', 'nonsense', '2026-02-30', '']) {
  test(`a bad date (${JSON.stringify(bad)}) falls back to today`, async ({ page }) => {
    await seedHabit({ name: 'Read', startDate: daysAgo(5) });
    const response = await page.goto(`/today?date=${bad}`);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
  });
}

test('a habit is listed from its start date on, not before', async ({ page }) => {
  await seedHabit({ name: 'Old', startDate: daysAgo(5) });
  await seedHabit({ name: 'New', startDate: daysAgo(0) });
  await page.goto('/today');
  await expect(todo(page)).toContainText('Old');
  await expect(todo(page)).toContainText('New');

  await page.goto(`/today?date=${daysAgo(1)}`);
  await expect(todo(page)).toContainText('Old');
  await expect(todo(page)).not.toContainText('New');

  await page.goto(`/today?date=${daysAgo(5)}`);
  await expect(todo(page)).toContainText('Old'); // its start date
});

test('streak tags show on today only', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  for (const n of [1, 2, 3]) await seedCompletion(id, daysAgo(n));
  await page.goto('/today');
  await expect(todo(page)).toContainText('🔥 3 days');
  await page.goto(`/today?date=${daysAgo(1)}`);
  await expect(done(page)).toContainText('Read');
  await expect(done(page)).not.toContainText('🔥');
});

test('with no habits at all, it invites you to create one', async ({ page }) => {
  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'No habits yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create your first habit' })).toHaveAttribute('href', '/habits');
});

test('when everything is ticked it says so, on today and on a past day', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedCompletion(id, daysAgo(0));
  await seedCompletion(id, daysAgo(1));
  await page.goto('/today');
  await expect(page.getByText('Nothing left for today.')).toBeVisible();
  await expect(doneToday(page)).toContainText('Read');

  await page.goto(`/today?date=${daysAgo(1)}`);
  await expect(page.getByText('Nothing left for this day.')).toBeVisible();
});

test('a day before every start date shows that no habits apply', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(2) });
  await page.goto(`/today?date=${daysAgo(4)}`);
  await expect(page.getByText('No habits on this day.')).toBeVisible();
  await expect(prev(page)).toHaveAttribute('aria-disabled', 'true');
});

test('the browser back button returns to the previous day', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/today');
  await prev(page).click();
  await expect(page).toHaveURL(new RegExp(`date=${daysAgo(1)}$`));
  await page.goBack();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
});
