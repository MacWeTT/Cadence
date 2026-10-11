import { expect, test } from '@playwright/test';
import { daysAgo, resetUserData, seedHabit } from '@e2e/support/data';

test.beforeEach(async () => {
  await resetUserData();
});

test('adds links to a habit, then opens them all from Today in one click', async ({ page, context }) => {
  await seedHabit({ name: 'LeetCode', startDate: daysAgo(3) });
  await page.goto('/habits');
  await page.getByRole('button', { name: 'Actions for LeetCode' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();

  const dialog = page.getByRole('dialog', { name: 'Edit habit' });

  await dialog.getByRole('button', { name: 'Add a link' }).click();
  await dialog.getByRole('textbox', { name: 'Link 1', exact: true }).fill('https://example.com/one');
  await dialog.getByRole('button', { name: 'Add a link' }).click();
  await dialog.getByRole('textbox', { name: 'Link 2', exact: true }).fill('https://example.com/two');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Habit saved')).toBeVisible();

  await page.goto('/today');
  await expect(page.getByRole('checkbox', { name: 'Mark LeetCode done' })).toBeVisible();

  const opened: string[] = [];

  context.on('page', tab => {
    opened.push(tab.url()); // the addresses may not load offline, so only the number of tabs is checked
  });
  await page.getByRole('button', { name: 'Open links for LeetCode' }).click();
  await expect
    .poll(() => {
      return opened.length;
    })
    .toBe(2);
});

test('a link that is not a web address is refused, and removing a link takes it out', async ({ page }) => {
  await seedHabit({ name: 'LeetCode', startDate: daysAgo(3) });
  await page.goto('/habits');
  await page.getByRole('button', { name: 'Actions for LeetCode' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();

  const dialog = page.getByRole('dialog', { name: 'Edit habit' });

  await dialog.getByRole('button', { name: 'Add a link' }).click();
  await dialog.getByRole('textbox', { name: 'Link 1', exact: true }).fill('javascript:alert(1)');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByText(/must be a web address/)).toBeVisible();

  await dialog.getByRole('button', { name: 'Remove link 1' }).click();
  await expect(dialog.getByRole('textbox', { name: 'Link 1', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Habit saved')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open links for LeetCode' })).toHaveCount(0);
});
