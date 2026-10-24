import { expect, test, type Page } from '@playwright/test';
import { cleanUp, makeCircle, makeFriend } from '@e2e/support/circles';
import { daysAgo, ensureE2EUser, resetUserData, seedHabit } from '@e2e/support/data';

const made: { circles: string[]; users: string[] } = { circles: [], users: [] };

test.beforeEach(async () => {
  await resetUserData();
});

test.afterEach(async () => {
  await cleanUp(made);
  made.circles = [];
  made.users = [];
  await resetUserData();
});

const openEdit = async (page: Page, name: string) => {
  await page.goto('/habits');
  await page.getByRole('button', { name: `Actions for ${name}` }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();

  return page.getByRole('dialog');
};

test('the habit dialog says so when you are in no circle yet, and links to Circles', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  const dialog = await openEdit(page, 'Read');

  await expect(dialog.getByText('Share with circles')).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByText('You are not in a circle yet.')).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Open Circles' })).toBeVisible();
});

test('a new habit has no sharing section, because it has nothing to share yet', async ({ page }) => {
  await page.goto('/habits');
  await page.getByRole('button', { name: 'New habit' }).first().click();

  await expect(page.getByRole('dialog').getByLabel('Name')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Share with circles')).toHaveCount(0);
});

test('choosing a level for a circle in the habit dialog shares the habit at once, and the circle page agrees', async ({
  page,
}) => {
  const me = await ensureE2EUser();
  const sam = await makeFriend('sam');
  const circle = await makeCircle('Study group', me, [sam]);

  made.users.push(sam);
  made.circles.push(circle);
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  const dialog = await openEdit(page, 'Read');
  const level = dialog.getByLabel('How much of this habit Study group sees');

  await expect(level).toHaveValue('hidden', { timeout: 20_000 });
  await level.selectOption('done_today');

  await expect
    .poll(async () => {
      const response = await page.request.get(`/api/circles/${circle}/sharing`);
      const { habits } = await response.json();

      return habits.find((habit: { name: string }) => {
        return habit.name === 'Read';
      })?.level;
    })
    .toBe('done_today');

  // The same choice, seen from the circle's own page.
  await page.goto(`/circles/${circle}`);
  await page.getByRole('button', { name: 'What I share', exact: true }).click();
  await expect(page.getByLabel('How much of Read this circle sees')).toHaveValue('done_today', { timeout: 20_000 });

  // And back in the dialog, on a fresh load.
  const again = await openEdit(page, 'Read');

  await expect(again.getByLabel('How much of this habit Study group sees')).toHaveValue('done_today', {
    timeout: 20_000,
  });
});
