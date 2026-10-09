import { expect, test, type Page } from '@playwright/test';
import { getHabits, resetUserData } from './support/data';

test.beforeEach(async () => {
  await resetUserData();
});

const openDialog = async (page: Page) => {
  await page.goto('/habits');
  await page.getByRole('button', { name: 'New habit' }).first().click();
  return page.getByRole('dialog', { name: 'New habit' });
};

test('a new user sees the empty state', async ({ page }) => {
  await page.goto('/habits');
  await expect(page.getByRole('heading', { name: 'No habits yet' })).toBeVisible();
});

test('creates a daily habit with an emoji found by search', async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByLabel('Name').fill('Read');
  await dialog.getByRole('button', { name: 'Choose emoji' }).click();
  await page.getByPlaceholder('Search emoji').fill('open book');
  await page.getByRole('gridcell', { name: /open book/i }).first().click();
  await expect(dialog.getByRole('button', { name: 'Choose emoji' })).toContainText('📖');
  await dialog.getByRole('button', { name: 'Save habit' }).click();

  await expect(page.getByText('Habit created')).toBeVisible();
  const row = page.getByRole('list', { name: 'Habits' }).getByRole('listitem').filter({ hasText: 'Read' });
  await expect(row).toContainText('Every day');
  await expect(row).toContainText('📖');
});

test('creates a weekly habit', async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByLabel('Name').fill('Run');
  await dialog.getByRole('radio', { name: 'Times a week' }).click();
  await dialog.getByLabel('Times per week').fill('3');
  await dialog.getByRole('button', { name: 'Save habit' }).click();
  const row = page.getByRole('list', { name: 'Habits' }).getByRole('listitem').filter({ hasText: 'Run' });
  await expect(row).toContainText('3× a week');
});

test('shows field errors and keeps the dialog open', async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByRole('button', { name: 'Save habit' }).click();
  await expect(dialog.getByText('Give your habit a name')).toBeVisible();

  await dialog.getByLabel('Name').fill('x'.repeat(81));
  await dialog.getByRole('button', { name: 'Save habit' }).click();
  await expect(dialog.getByText('Keep the name to 80 characters or fewer')).toBeVisible();
  await expect(dialog).toBeVisible();
  expect(await getHabits()).toHaveLength(0);
});

test('a double-click on Save creates exactly one habit', async ({ page }) => {
  const dialog = await openDialog(page);
  await dialog.getByLabel('Name').fill('Meditate');
  await dialog.getByRole('button', { name: 'Save habit' }).dblclick();
  await expect(page.getByText('Habit created')).toBeVisible();
  await expect.poll(async () => (await getHabits()).length).toBe(1);
});

test('Escape closes the dialog and returns focus to New habit', async ({ page }) => {
  await openDialog(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'New habit' }).first()).toBeFocused();
});

test('the emoji grid can be used with the keyboard only', async ({ page }) => {
  const dialog = await openDialog(page);
  const chooser = dialog.getByRole('button', { name: 'Choose emoji' });
  const before = await chooser.innerText();
  await chooser.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByPlaceholder('Search emoji')).toBeFocused();
  await page.keyboard.type('book');
  await expect(page.getByRole('gridcell', { name: /book/i }).first()).toBeVisible(); // results have filtered
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(chooser).not.toHaveText(before);
});
