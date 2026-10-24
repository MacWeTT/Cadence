import { expect, test } from '@playwright/test';
import { cleanUp, makeCircle, makeLoginFriend } from '@e2e/support/circles';
import { ensureE2EUser, resetUserData } from '@e2e/support/data';

test.beforeEach(async () => {
  await resetUserData();
});

test.afterEach(async () => {
  await resetUserData();
});

test('an invite link opened while signed out brings the person back to it after signing in, and they can join', async ({
  page,
  browser,
  baseURL,
}) => {
  const me = await ensureE2EUser();
  const sam = await makeLoginFriend('Sam');
  const circle = await makeCircle('Study group', me, []);
  const guestContext = await browser.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
    reducedMotion: 'reduce',
  });

  try {
    // The owner makes the link.
    await page.goto(`/circles/${circle}`);
    await page.getByRole('button', { name: 'Invite', exact: true }).click();

    const field = page.getByLabel('Invite link');

    await expect(field).toHaveValue(/\/circles\/join\/[0-9a-f]{64}$/, { timeout: 20_000 });

    const link = await field.inputValue();

    // Someone who is signed out opens it, and is sent to sign in with the link remembered.
    const guest = await guestContext.newPage();

    await guest.goto(link);
    await expect(guest).toHaveURL(/\/login\?next=%2Fcircles%2Fjoin%2F[0-9a-f]{64}$/, { timeout: 20_000 });

    await guest.getByRole('tab', { name: 'Email', exact: true }).click();
    await guest.getByLabel('Email').fill(sam.email);
    await guest.getByLabel('Password').fill(sam.password);
    await guest.getByRole('button', { name: 'Sign in', exact: true }).click();

    // After signing in they are on the invite, not on Home.
    await expect(guest).toHaveURL(/\/circles\/join\/[0-9a-f]{64}$/, { timeout: 20_000 });
    await expect(guest.getByRole('heading', { name: 'Join Study group?' })).toBeVisible();

    await guest.getByRole('button', { name: 'Join circle' }).click();
    await expect(guest).toHaveURL(/\/circles\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(guest.getByRole('heading', { level: 1, name: 'Study group', exact: true })).toBeVisible();
  } finally {
    await guestContext.close();
    await cleanUp({ circles: [circle], users: [sam.id] });
  }
});
