import { expect, test, type Page } from '@playwright/test';
import { daysAgo, getArchivePeriods, getHabits, resetUserData, seedHabit } from './support/data';

test.beforeEach(async () => {
  await resetUserData();
});

const activeList = (page: Page) => {
  return page.getByRole('list', { name: 'Habits' });
};

const archivedToggle = (page: Page) => {
  return page.getByRole('button', { name: /^Archived \(\d+\)/ });
};

const archivedList = (page: Page) => {
  return page.getByRole('list', { name: 'Archived habits' });
};

const actions = (page: Page, name: string) => {
  return page.getByRole('button', { name: `Actions for ${name}` });
};

const archive = async (page: Page, name: string) => {
  await actions(page, name).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();
  await expect(page.getByText('Habit archived')).toBeVisible();
};

test('archiving moves a habit to the collapsed Archived section', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(3) });
  await seedHabit({ name: 'Run', startDate: daysAgo(3) });
  await page.goto('/habits');
  await archive(page, 'Read');

  await expect(activeList(page)).not.toContainText('Read');
  await expect(activeList(page)).toContainText('Run');
  await expect(archivedToggle(page)).toHaveText(/Archived \(1\)/);
  await expect(archivedList(page)).toHaveCount(0); // collapsed by default
  await archivedToggle(page).click();
  await expect(archivedList(page)).toContainText('Read');
});

test('restoring moves it back, and the pause is recorded as a closed zero-length period', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(3) });

  await page.goto('/habits');
  await archive(page, 'Read');
  await archivedToggle(page).click();
  await actions(page, 'Read').click();
  await page.getByRole('menuitem', { name: 'Restore' }).click();

  await expect(page.getByText('Habit restored')).toBeVisible();
  await expect(activeList(page)).toContainText('Read');
  await expect(archivedToggle(page)).toHaveCount(0);

  const periods = await getArchivePeriods(id);

  expect(periods).toHaveLength(1);
  expect(periods[0].restored_on).toBe(periods[0].archived_on); // archived and restored on the same day
  expect((await getHabits())[0].archived_at).toBeNull();
});

test('Delete is only offered for archived habits, which also cannot be edited', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(3) });
  await page.goto('/habits');

  await actions(page, 'Read').click();
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await archive(page, 'Read');
  await archivedToggle(page).click();
  await actions(page, 'Read').click();
  await expect(page.getByRole('menuitem', { name: 'Restore' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toHaveCount(0);
});

test('deleting asks for confirmation, can be cancelled, and removes the habit', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(3) });
  await page.goto('/habits');
  await archive(page, 'Read');
  await archivedToggle(page).click();

  const open = async () => {
    await actions(page, 'Read').click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    return page.getByRole('alertdialog', { name: 'Delete Read?' });
  };

  let dialog = await open();

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(actions(page, 'Read')).toBeFocused(); // focus returns to the row's menu button
  expect(await getHabits()).toHaveLength(1);

  dialog = await open();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(actions(page, 'Read')).toBeFocused();
  expect(await getHabits()).toHaveLength(1);

  dialog = await open();
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Habit deleted')).toBeVisible();
  await expect
    .poll(async () => {
      return (await getHabits()).length;
    })
    .toBe(0);
  await expect(archivedToggle(page)).toHaveCount(0);
});
