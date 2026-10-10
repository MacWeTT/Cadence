import { expect, test, type Page } from '@playwright/test';
import { daysAgo, getCompletions, resetUserData, seedCompletion, seedHabit } from './support/data';

test.beforeEach(async () => {
  await resetUserData();
});

// The e2e profile is UTC, so a fixed UTC time on the server's own date drives the banner tier. Set before `goto`.
const at = async (page: Page, hhmm: string) => page.clock.setFixedTime(new Date(`${daysAgo(0)}T${hhmm}:00Z`));
const banner = (page: Page) => page.getByTestId('banner'); // the visible message; the live region keeps its own copy
const check = (page: Page, name: string) => page.getByRole('checkbox', { name: `Mark ${name} done` });

/** Read has a 3-day streak that ends at midnight unless it is ticked; Run has none. */
async function seedStreakAndPlain() {
  const read = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  for (const n of [1, 2, 3]) await seedCompletion(read, daysAgo(n));
  await seedHabit({ name: 'Run', startDate: daysAgo(5) });
}

test('opens at the root with a greeting that uses your first name, and keeps it while you tick', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedHabit({ name: 'Run', startDate: daysAgo(5) });
  await page.goto('/');
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toContainText('E2E');
  await expect(title).not.toContainText('{name}');
  const before = await title.textContent();
  await check(page, 'Read').click();
  await expect(page.getByRole('img', { name: '1 of 2 done today' })).toBeVisible();
  await expect(title).toHaveText(before!);
});

test('ticking from Home moves the row, updates the ring and persists', async ({ page }) => {
  const read = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedHabit({ name: 'Run', startDate: daysAgo(5) });
  await page.goto('/');
  await expect(page.getByRole('img', { name: '0 of 2 done today' })).toBeVisible();
  await check(page, 'Read').click();
  await expect(page.getByRole('list', { name: /Done today/ })).toContainText('Read');
  await expect(page.getByRole('list', { name: /Next up/ })).not.toContainText('Read');
  await expect(page.getByRole('img', { name: '1 of 2 done today' })).toBeVisible();
  await expect.poll(async () => (await getCompletions(read)).length).toBe(1); // saved, so the reload cannot cut it short
  await page.reload();
  await expect(page.getByRole('list', { name: /Done today/ })).toContainText('Read');
});

test('the banner grows louder through the day', async ({ page }) => {
  await seedStreakAndPlain();
  const tiers: [string, string][] = [
    ['09:00', '2 habits today. A good day to start with Read.'],
    ['14:00', '2 left, 10h to go.'],
    ['20:00', "4h left. Read's 3-day streak ends at midnight."],
    ['22:30', "Last call: 1h 30m. Don't lose your 3-day Read streak!"],
  ];
  for (const [time, message] of tiers) {
    await at(page, time);
    await page.goto('/');
    await expect(banner(page)).toContainText(message);
  }
});

test('the evening banner button focuses the habit, and the streak shows under "Streaks to protect"', async ({
  page,
}) => {
  await seedStreakAndPlain();
  await at(page, '20:00');
  await page.goto('/');
  const streaks = page.getByRole('region', { name: 'Streaks to protect' });
  await expect(streaks).toContainText('Read');
  await expect(streaks).toContainText('3 days · ends at midnight');
  await expect(streaks).not.toContainText('Run');
  await page.getByRole('button', { name: 'Do Read now' }).click();
  await expect(check(page, 'Read')).toBeFocused();
});

test('ticking everything turns the banner into a celebration', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedHabit({ name: 'Run', startDate: daysAgo(5) });
  await at(page, '14:00');
  await page.goto('/');
  await check(page, 'Read').click();
  await expect(banner(page)).toContainText('1 left');
  await check(page, 'Run').click();
  await expect(banner(page)).toContainText('All 2 done. Nice.');
});

test('with no habits it invites you to create one, and says nothing else', async ({ page }) => {
  await at(page, '22:30');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'No habits yet' })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test('the Cadence logo leads home from any page', async ({ page }) => {
  await page.goto('/habits');
  const logo = page.getByRole('link', { name: 'Cadence' });
  await expect(logo).not.toHaveAttribute('aria-current', 'page');
  await logo.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(logo).toHaveAttribute('aria-current', 'page');
});

test('"New habit" on Home creates a habit that shows up under Next up', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/');
  await page.getByRole('button', { name: 'New habit' }).click();
  const dialog = page.getByRole('dialog', { name: 'New habit' });
  await dialog.getByLabel('Name').fill('Stretch');
  await dialog.getByRole('button', { name: 'Save habit' }).click();
  await expect(page.getByRole('list', { name: /Next up/ })).toContainText('Stretch');
});

test('a weekly habit with no streak is not listed under streaks to protect', async ({ page }) => {
  // The weekly at-risk rule depends on the calendar and is unit-tested in home-view.test.ts.
  await seedHabit({ name: 'Swim', startDate: daysAgo(30), kind: 'weekly_count', timesPerWeek: 3 });
  await at(page, '20:00');
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Streaks to protect' })).toContainText('No streaks at risk right now.');
});

test('the screen-reader announcement does not repeat every minute', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedHabit({ name: 'Run', startDate: daysAgo(5) });
  await page.clock.install({ time: new Date(`${daysAgo(0)}T14:00:30Z`) });
  await page.goto('/');
  const spoken = page.getByRole('status').filter({ hasText: 'to go' });
  const visible = page.getByTestId('banner');
  const spokenBefore = await spoken.textContent();
  const visibleBefore = await visible.textContent();
  await page.clock.runFor(61_000);
  await expect(visible).not.toHaveText(visibleBefore!); // the visible countdown moved on...
  expect(await spoken.textContent()).toBe(spokenBefore); // ...but nothing new was announced
});

test('the page refreshing itself does not pull focus back to a ticked row', async ({ page }) => {
  const read = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedHabit({ name: 'Run', startDate: daysAgo(5) });
  await page.clock.install({ time: new Date(`${daysAgo(0)}T14:00:30Z`) });
  await page.goto('/');
  await check(page, 'Read').click();
  await expect.poll(async () => (await getCompletions(read)).length).toBe(1);
  await page.getByRole('heading', { level: 1 }).click(); // click away: focus goes to the page body
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.clock.runFor(61_000); // Home re-renders when the minute changes
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test('a clock past local midnight refreshes the lists once, and does not loop', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  const refreshes: string[] = [];
  page.on('request', r => {
    const u = new URL(r.url());
    if (u.pathname === '/' && u.searchParams.has('_rsc')) refreshes.push(u.href);
  });
  await page.clock.setFixedTime(new Date(`${daysAgo(-1)}T00:05:00Z`)); // tomorrow, shortly after midnight
  await page.goto('/');
  await expect.poll(() => refreshes.length).toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  expect(refreshes.length).toBeLessThanOrEqual(2);
});

test('a save that finishes after you click away does not pull focus back to the row', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedHabit({ name: 'Run', startDate: daysAgo(5) });
  await page.route('**/*', async route => {
    if (route.request().headers()['next-action']) await new Promise(resolve => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto('/');
  await check(page, 'Read').click();
  await page.getByRole('heading', { level: 1 }).click(); // click away while the save is still on its way
  await page.waitForTimeout(2500); // the save finishes and the page refreshes
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});
