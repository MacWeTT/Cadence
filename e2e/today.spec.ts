import { expect, test, type Page } from '@playwright/test';
import {
  archiveHabitDirect,
  daysAgo,
  getCompletions,
  resetUserData,
  restoreHabitDirect,
  seedCompletion,
  seedHabit,
  setWeekStartForTests,
} from './support/data';

test.beforeEach(async () => {
  await resetUserData();
  await setWeekStartForTests();
});

const todo = (page: Page) => page.getByRole('list', { name: 'To do' });
const done = (page: Page) => page.getByRole('list', { name: 'Done today' });
const row = (list: ReturnType<typeof todo>, name: string) => list.getByRole('listitem').filter({ hasText: name });
const check = (page: Page, name: string, ticked = false) =>
  page.getByRole('checkbox', { name: ticked ? `Mark ${name} not done` : `Mark ${name} done` });

test('ticking moves a habit to Done, bumps the streak and persists; unticking moves it back', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  for (const n of [1, 2, 3]) await seedCompletion(id, daysAgo(n));
  await page.goto('/today');
  await expect(row(todo(page), 'Read')).toContainText('🔥 3 days');

  await check(page, 'Read').click();
  await expect(row(done(page), 'Read')).toBeVisible();
  await expect(row(done(page), 'Read')).toContainText('🔥 4 days'); // after the server refresh
  await expect.poll(async () => (await getCompletions(id)).length).toBe(4);

  await page.reload();
  await expect(row(done(page), 'Read')).toBeVisible();

  await check(page, 'Read', true).click();
  await expect(row(todo(page), 'Read')).toBeVisible();
  await expect.poll(async () => (await getCompletions(id)).length).toBe(3);
});

test('a weekly habit shows its progress and "Goal met", and unticking brings the progress back', async ({ page }) => {
  const id = await seedHabit({ name: 'Run', startDate: daysAgo(20), kind: 'weekly_count', timesPerWeek: 2 });
  await seedCompletion(id, daysAgo(1)); // always in the same week as today (see setWeekStartForTests)
  await page.goto('/today');
  await expect(row(todo(page), 'Run')).toContainText('1 of 2 this week');

  await check(page, 'Run').click();
  await expect(row(done(page), 'Run')).toContainText('Goal met');

  await check(page, 'Run', true).click();
  await expect(row(todo(page), 'Run')).toContainText('1 of 2 this week');
});

test('an archived habit is hidden and comes back with its earlier ticks after a restore', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedCompletion(id, daysAgo(1));
  await archiveHabitDirect(id, daysAgo(0));
  await page.goto('/today');
  await expect(page.getByText('Read', { exact: true })).toHaveCount(0);

  await restoreHabitDirect(id, daysAgo(0));
  await page.reload();
  await expect(row(todo(page), 'Read')).toContainText('🔥 1 day'); // yesterday's tick still counts
});

test('a double tap sends one request and creates one completion', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/today');
  await check(page, 'Read').dblclick();
  await expect.poll(async () => (await getCompletions(id)).length).toBe(1);
  await page.waitForTimeout(700);
  expect(await getCompletions(id)).toHaveLength(1);
});

test('a failed save rolls the row back and shows a message', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/today');
  await page.route('**/*', (route) => (route.request().headers()['next-action'] ? route.abort() : route.continue()));
  await check(page, 'Read').click();
  await expect(page.getByText("Couldn't save that")).toBeVisible();
  await expect(row(todo(page), 'Read')).toBeVisible(); // back in To do
  expect(await getCompletions(id)).toHaveLength(0);
});

test('a row can be ticked from the keyboard', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/today');
  await check(page, 'Read').focus();
  await page.keyboard.press('Space');
  await expect(row(done(page), 'Read')).toBeVisible();
  await expect(check(page, 'Read', true)).toBeFocused(); // focus follows the row to the other list
  await expect(check(page, 'Read', true)).toHaveAttribute('aria-disabled', 'false'); // the save has finished
  await page.keyboard.press('Space'); // and it can be undone without reaching for the mouse
  await expect(row(todo(page), 'Read')).toBeVisible();
  await expect(check(page, 'Read')).toBeFocused();
});
