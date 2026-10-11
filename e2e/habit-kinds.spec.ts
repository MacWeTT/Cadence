import { expect, test } from '@playwright/test';
import { daysAgo, resetUserData, seedHabit, setWeekStartForTests } from '@e2e/support/data';

test.beforeEach(async () => {
  await resetUserData();
  await setWeekStartForTests();
});

// Every day of the week but today's, so the habit is certainly not expected today.
const otherDays = () => {
  const today = new Date().getDay() || 7; // in the test's own timezone; the e2e user's timezone is UTC

  return [1, 2, 3, 4, 5, 6, 7]
    .filter(day => {
      return day !== today;
    })
    .slice(0, 3);
};

test('creates a fixed-days habit from the dialog', async ({ page }) => {
  await page.goto('/habits');
  await page.getByRole('button', { name: 'New habit' }).first().click();

  const dialog = page.getByRole('dialog', { name: 'New habit' });

  await dialog.getByLabel('Name').fill('Gym');
  await dialog.getByRole('radio', { name: 'Certain days' }).click();
  await dialog.getByRole('button', { name: 'Monday' }).click(); // off: Monday-Friday start ticked
  await dialog.getByRole('button', { name: 'Saturday' }).click();
  await dialog.getByRole('button', { name: 'Save habit' }).click();

  await expect(page.getByText('Habit created')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Gym' })).toContainText('Every Tue, Wed, Thu, Fri, Sat');
});

test('a fixed-days habit is not listed on a day it is not expected', async ({ page }) => {
  await seedHabit({ name: 'Gym', startDate: daysAgo(10), kind: 'weekdays', weekdays: otherDays() });
  await seedHabit({ name: 'Read', startDate: daysAgo(10) });
  await page.goto('/today');

  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Mark Gym done' })).toHaveCount(0);
});

test('an optional habit has its own section and counts ticks this year', async ({ page }) => {
  await seedHabit({ name: 'Call mum', startDate: daysAgo(10), kind: 'optional' });
  await seedHabit({ name: 'Read', startDate: daysAgo(10) });
  await page.goto('/today');

  const section = page.getByRole('list', { name: 'Whenever you like' });

  await expect(section).toContainText('Call mum');
  await expect(section).toContainText('0 times this year');
  await page.getByRole('checkbox', { name: 'Mark Call mum done' }).click();
  await expect(section).toContainText('1 time this year');
  await expect(page.getByRole('list', { name: 'To do' }).getByRole('listitem')).not.toContainText('Call mum');
});

test('an optional habit stays out of the Home ring and shows its count on Progress', async ({ page }) => {
  await seedHabit({ name: 'Call mum', startDate: daysAgo(10), kind: 'optional' });
  await page.goto('/');
  await expect(page.getByRole('checkbox', { name: 'Mark Call mum done' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Mark Call mum done' }).click();
  await expect(page.getByText('1 time this year')).toBeVisible();

  await page.getByRole('banner').getByRole('link', { name: 'Progress' }).click();
  const rates = page.getByRole('region', { name: /Completion, last 30 days/ });

  await expect(rates).toContainText('Call mum');
  await expect(rates).toContainText('1 time this year');
});
