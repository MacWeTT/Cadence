import { expect, test, type Page } from '@playwright/test';
import { daysAgo, getHabits, getSchedules, resetUserData, seedCompletion, seedHabit } from './support/data';

test.beforeEach(async () => {
  await resetUserData();
});

const rowFor = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Habits' }).getByRole('listitem').filter({ hasText: name });

async function openEdit(page: Page, name: string) {
  await page.goto('/habits');
  await page.getByRole('button', { name: `Actions for ${name}` }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  return page.getByRole('dialog', { name: 'Edit habit' });
}

test('editing the name, emoji and color shows immediately', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(3) });
  const dialog = await openEdit(page, 'Read');
  await expect(dialog.getByLabel('Name')).toHaveValue('Read');
  await dialog.getByLabel('Name').fill('Read more');
  await dialog.locator('label', { hasText: 'clay' }).click(); // the radio itself is visually hidden
  await dialog.getByRole('button', { name: 'Choose emoji' }).click();
  await page.getByPlaceholder('Search emoji').fill('books');
  await page.getByRole('gridcell', { name: /books/i }).first().click();
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Habit saved')).toBeVisible();
  await expect(rowFor(page, 'Read more')).toContainText('📚');
  const [habit] = await getHabits();
  expect([habit.name, habit.color, habit.icon.replace(/️/g, '')]).toEqual(['Read more', 'clay', '📚']); // the picker may add an invisible variation selector
});

test('a habit without ticks changes its schedule immediately', async ({ page }) => {
  await seedHabit({ name: 'Run', startDate: daysAgo(3) });
  const dialog = await openEdit(page, 'Run');
  await dialog.getByRole('radio', { name: 'Times a week' }).click();
  await dialog.getByLabel('Times per week').fill('3');
  await expect(dialog.getByText(/Changes apply from/)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(rowFor(page, 'Run')).toContainText('3× a week');
  const [habit] = await getHabits();
  expect(await getSchedules(habit.id)).toHaveLength(1);
});

test('a habit with ticks schedules the change for next week and replaces it on a second edit', async ({ page }) => {
  const id = await seedHabit({ name: 'Run', startDate: daysAgo(5) });
  await seedCompletion(id, daysAgo(5));

  let dialog = await openEdit(page, 'Run');
  await dialog.getByRole('radio', { name: 'Times a week' }).click();
  await dialog.getByLabel('Times per week').fill('3');
  await expect(dialog.getByText(/Changes apply from/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(rowFor(page, 'Run')).toContainText('Every day');
  await expect(rowFor(page, 'Run')).toContainText('Changes to 3× a week on');
  expect(await getSchedules(id)).toHaveLength(2);

  // A second edit the same week replaces the pending change instead of adding another.
  dialog = await openEdit(page, 'Run');
  await dialog.getByLabel('Times per week').fill('4');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(rowFor(page, 'Run')).toContainText('Changes to 4× a week on');
  const schedules = await getSchedules(id);
  expect(schedules).toHaveLength(2);
  expect(schedules[1].times_per_week).toBe(4);

  // Changing back removes the pending change.
  dialog = await openEdit(page, 'Run');
  await dialog.getByRole('radio', { name: 'Every day' }).click();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(rowFor(page, 'Run')).not.toContainText('Changes to');
  expect(await getSchedules(id)).toHaveLength(1);
});

test('the start date can move earlier but not past the first tick', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedCompletion(id, daysAgo(5));

  let dialog = await openEdit(page, 'Read');
  await dialog.getByLabel('Starts').fill(daysAgo(2));
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByText(/can't be after your first check-in/)).toBeVisible();
  expect((await getHabits())[0].start_date).toBe(daysAgo(5));

  await dialog.getByLabel('Starts').fill(daysAgo(10));
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Habit saved')).toBeVisible();
  expect((await getHabits())[0].start_date).toBe(daysAgo(10));
  dialog = page.getByRole('dialog');
  await expect(dialog).toBeHidden();
});
