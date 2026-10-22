import { expect, test, type Browser } from '@playwright/test';
import { createThrowawayUser, deleteUser, getRegistrationRow } from '@e2e/support/data';
import { signInState } from '@e2e/support/session';

/** A signed-in browser for a throwaway account that has not registered yet, like one that has just come back from Google. */
const newcomer = async (browser: Browser, baseURL: string | undefined) => {
  const user = await createThrowawayUser('zqreg');
  const context = await browser.newContext({ baseURL, storageState: await signInState(user.email, user.password) });

  return { user, context, page: await context.newPage() };
};

test('the register screen shows the email locked and the default tag, and only saves a good tag and password', async ({
  browser,
  baseURL,
}) => {
  const { user, context, page } = await newcomer(browser, baseURL);

  try {
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: 'Finish setting up' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveValue(user.email);
    await expect(page.getByLabel('Email')).toBeDisabled();
    await expect(page.getByLabel('Tag')).toHaveValue(/^zqreg_\d+$/);

    const save = page.getByRole('button', { name: 'Save and continue' });

    await expect(save).toBeDisabled(); // no password yet

    await page.getByLabel('Tag').fill('ab');
    await page.getByLabel('Password', { exact: true }).fill('longenough');
    await page.getByLabel('Confirm password').fill('longenough');
    await expect(save).toBeDisabled(); // the tag is too short

    await page.getByLabel('Tag').fill('zqreg_ok');
    await page.getByLabel('Confirm password').fill('different!');
    await expect(save).toBeDisabled(); // the passwords differ

    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm password').fill('short');
    await expect(save).toBeDisabled(); // under 8 characters
  } finally {
    await context.close();
    await deleteUser(user.id);
  }
});

test('a tag someone has is refused, and a good form saves the tag and password and goes on to where it was heading', async ({
  browser,
  baseURL,
}) => {
  const { user, context, page } = await newcomer(browser, baseURL);

  try {
    await page.goto('/register?next=/habits');
    await page.getByLabel('Password', { exact: true }).fill('a-new-password-1');
    await page.getByLabel('Confirm password').fill('a-new-password-1');

    await page.getByLabel('Tag').fill('e2e'); // the shared test account has it
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await expect(page.locator('.register-form__error')).toHaveText('That tag is taken. Try another.');
    expect((await getRegistrationRow(user.id)).registered_at).toBeNull();

    await page.getByLabel('Tag').fill('zqreg_mine');
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await expect(page).toHaveURL(/localhost:\d+\/habits$/);

    const row = await getRegistrationRow(user.id);

    expect(row).toMatchObject({ tag: 'zqreg_mine', password_set: true });
    expect(row.registered_at).not.toBeNull();

    // the password really is set: the account can sign in with it
    await expect(signInState(user.email, 'a-new-password-1')).resolves.toBeTruthy();
  } finally {
    await context.close();
    await deleteUser(user.id);
  }
});

test('an account that has registered goes straight on, to the path it was heading for or Home', async ({ page }) => {
  await page.goto('/register');
  await expect(page).toHaveURL(/localhost:\d+\/$/);

  await page.goto('/register?next=/habits');
  await expect(page).toHaveURL(/localhost:\d+\/habits$/);

  await page.goto('/register?next=https://evil.example/');
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test('the profile says when no password is set, and the Account tab sets one', async ({ browser, baseURL }) => {
  const { user, context, page } = await newcomer(browser, baseURL);

  try {
    await page.goto('/profile');

    const warning = page.getByRole('status').filter({ hasText: 'This account has no password yet' });

    await expect(warning).toBeVisible();
    await warning.getByRole('link', { name: 'Set a password' }).click();
    await expect(page).toHaveURL(/\/profile\/account$/);

    const card = page.locator('.account-card', { has: page.getByRole('heading', { name: 'Sign-in' }) });

    await expect(card).toContainText('Not set');
    await card.getByRole('button', { name: 'Set a password' }).click();

    const dialog = page.getByRole('dialog');

    await dialog.getByLabel('New password').fill('a-new-password-2');
    await dialog.getByLabel('Confirm password').fill('a-new-password-2');
    await dialog.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Password saved')).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(card).toContainText('Set');
    await expect(card.getByRole('button', { name: 'Change password' })).toBeVisible();
    await expect(warning).toBeHidden();
    expect((await getRegistrationRow(user.id)).password_set).toBe(true);
  } finally {
    await context.close();
    await deleteUser(user.id);
  }
});

test('an account with a password has no warning, on the profile or anywhere else', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('This account has no password yet')).toHaveCount(0);

  await page.goto('/profile/account');
  await expect(page.locator('.account-card', { has: page.getByRole('heading', { name: 'Sign-in' }) })).toContainText(
    'Set',
  );
});
