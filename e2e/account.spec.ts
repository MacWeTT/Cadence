import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { toJson } from '@/lib/backup';
import { toCsv } from '@/lib/backup-csv';
import type { Backup } from '@/lib/backup-types';
import {
  adminClient,
  daysAgo,
  getHabits,
  resetProfile,
  resetUserData,
  seedCompletion,
  seedHabit,
} from '@e2e/support/data';
import { signInState } from '@e2e/support/session';

const backup = (over: Partial<Backup['habits'][number]> = {}): Backup => {
  return {
    app: 'cadence',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: { name: 'Someone', timezone: 'UTC', weekStartsOn: 1 },
    habits: [
      {
        name: 'Restored, with a comma',
        description: 'Back from a file',
        icon: '🌱',
        color: 'teal',
        startDate: daysAgo(10),
        createdAt: null,
        links: [],
        archivedAt: null,
        schedules: [{ kind: 'daily', timesPerWeek: null, weekdays: null, effectiveFrom: daysAgo(10) }],
        ticks: [daysAgo(1), daysAgo(2)],
        pauses: [],
        focusSessions: [],
        ...over,
      },
    ],
  };
};

const file = (name: string, mimeType: string, text: string) => {
  return { name, mimeType, buffer: Buffer.from(text) };
};

const seedTwo = async () => {
  const read = await seedHabit({ name: 'Read', startDate: daysAgo(10) });

  await seedHabit({ name: 'Run', startDate: daysAgo(10) });
  await seedCompletion(read, daysAgo(1));
  await seedCompletion(read, daysAgo(2));
};

const openAccount = async (page: Page) => {
  await page.goto('/profile/account');
  await expect(page.getByRole('heading', { level: 2, name: 'Import your data' })).toBeVisible();
};

test.beforeEach(async () => {
  await resetUserData();
  await resetProfile();
});
test.afterEach(async () => {
  await resetUserData();
  await resetProfile();
});

test('the default tab title says what Cadence is for', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Cadence · For habits that stick');
});

test('the Account tab shows what you have, and the import limits', async ({ page }) => {
  await seedTwo();
  await openAccount(page);

  await expect(page.getByText('You have 2 habits, 2 check-ins and 0 focus sessions.')).toBeVisible();
  await expect(page.getByText(/Up to 5 MB, 500 habits, 200,000 check-ins and 50,000 focus sessions\./)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Delete your account' })).toBeVisible();
});

test('the export downloads as JSON, CSV and PDF', async ({ page }) => {
  await seedTwo();
  await openAccount(page);

  const download = async (name: string) => {
    const [saved] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name }).click()]);

    return { name: saved.suggestedFilename(), body: readFileSync(await saved.path()) };
  };

  const json = await download('Download JSON');

  expect(json.name).toMatch(/^cadence-\d{4}-\d{2}-\d{2}\.json$/);
  expect(JSON.parse(json.body.toString())).toMatchObject({
    app: 'cadence',
    habits: [{ name: 'Read', ticks: [daysAgo(2), daysAgo(1)] }, { name: 'Run' }],
  });

  const csv = (await download('Download CSV')).body.toString();

  expect(csv).toContain('record,habit,name');
  expect(csv.match(/^tick,/gm)).toHaveLength(2);

  const pdf = await download('Download PDF');

  expect(pdf.name).toMatch(/\.pdf$/);
  expect(pdf.body.subarray(0, 5).toString()).toBe('%PDF-');
});

test('a JSON backup replaces everything, after a warning', async ({ page }) => {
  await seedTwo();
  await openAccount(page);
  await page.locator('input[type=file]').setInputFiles(file('backup.json', 'application/json', toJson(backup())));

  const dialog = page.getByRole('dialog');

  await expect(dialog.getByText('This file has 1 habit, 2 check-ins and 0 focus sessions.')).toBeVisible();
  await expect(dialog.getByText(/replaces all your current habits and history/)).toBeVisible();

  const confirm = dialog.getByRole('button', { name: 'Replace my data' });

  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('I understand').check();
  await confirm.click();

  await expect(page.getByText('Restored 1 habit and 2 check-ins.')).toBeVisible();
  await expect
    .poll(async () => {
      return (await getHabits()).map(h => {
        return h.name;
      });
    })
    .toEqual(['Restored, with a comma']);
});

test('a CSV backup restores too', async ({ page }) => {
  await openAccount(page);
  await page
    .locator('input[type=file]')
    .setInputFiles(file('backup.csv', 'text/csv', toCsv(backup({ name: '=Odd name' }))));

  const dialog = page.getByRole('dialog');

  await dialog.getByLabel('I understand').check();
  await dialog.getByRole('button', { name: 'Replace my data' }).click();

  await expect(page.getByText('Restored 1 habit and 2 check-ins.')).toBeVisible();
  await expect
    .poll(async () => {
      return (await getHabits()).map(h => {
        return h.name;
      });
    })
    .toEqual(['=Odd name']);
});

test('a file that is not a backup is refused and nothing changes', async ({ page }) => {
  await seedTwo();
  await openAccount(page);
  await page.locator('input[type=file]').setInputFiles(file('x.json', 'application/json', '{"hello": 1}'));

  await expect(page.getByText("That isn't a Cadence backup.")).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await getHabits()).toHaveLength(2);
});

test('a backup with a check-in after today is refused, naming the problem', async ({ page }) => {
  await seedTwo();
  await openAccount(page);
  await page
    .locator('input[type=file]')
    .setInputFiles(file('late.json', 'application/json', toJson(backup({ ticks: ['2999-01-01'] }))));

  await expect(page.getByText(/problem in habit 1: a check-in is after today/)).toBeVisible();
  expect(await getHabits()).toHaveLength(2);
});

test('deleting the account needs the typed email, then removes it and says so on the login page', async ({
  browser,
  baseURL,
}) => {
  const email = `delete-${Date.now()}@cadence.test`;
  const password = 'delete-password-123!';
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Delete Me' },
  });

  if (error || !data.user) {
    throw error;
  }

  const context = await browser.newContext({ baseURL, storageState: await signInState(email, password) });
  const page = await context.newPage();

  await openAccount(page);
  await page.getByRole('button', { name: 'Delete account' }).click();

  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Delete forever' });

  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type your email address to confirm').fill('someone-else@cadence.test');
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type your email address to confirm').fill(email);
  await confirm.click();

  await expect(page).toHaveURL(/\/login\?deleted=1$/);
  await expect(page.getByText('Your account has been deleted.')).toBeVisible();

  const { data: after } = await admin.auth.admin.getUserById(data.user.id);

  expect(after.user).toBeNull();
  await context.close();
});
