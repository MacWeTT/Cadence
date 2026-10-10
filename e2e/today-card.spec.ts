import { expect, test, type Page } from '@playwright/test';
import { daysAgo, resetUserData, seedCompletion, seedHabit, setWeekStartForTests } from './support/data';

test.beforeEach(async () => {
  await resetUserData();
  await setWeekStartForTests();
});

const card = (page: Page) => page.getByRole('complementary', { name: 'Progress' });

test('the card counts done against listed habits and follows ticking', async ({ page }) => {
  const read = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedHabit({ name: 'Run', startDate: daysAgo(5) });
  await seedCompletion(read, daysAgo(0));
  await page.goto('/today');
  await expect(card(page)).toContainText('1 of 2');
  await expect(card(page).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

  await page.getByRole('checkbox', { name: 'Mark Run done' }).click();
  await expect(card(page)).toContainText('2 of 2');
  await expect(card(page).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
});

test('the week strip shows yesterday as done and opens that day', async ({ page }) => {
  // yesterday is always in the same week as today (see setWeekStartForTests)
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedCompletion(id, daysAgo(1));
  await page.goto('/today');
  const yesterday = card(page).getByRole('link', { name: /1 of 1 done$/ });
  await expect(yesterday).toHaveCount(1);
  await yesterday.click();
  await expect(page).toHaveURL(new RegExp(`date=${daysAgo(1)}$`));
  await expect(card(page).locator('a[aria-current="date"]')).toHaveAccessibleName(/1 of 1 done$/);
});

test('with no habits the card is not shown', async ({ page }) => {
  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'No habits yet' })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});
