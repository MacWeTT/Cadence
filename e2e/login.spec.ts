import { expect, test, type Page } from '@playwright/test';
import { E2E_USER, createThrowawayUser, deleteUser, deleteUserByEmail, getRegistrationRow } from '@e2e/support/data';

test.use({ storageState: { cookies: [], origins: [] } });

const MISMATCH = "That tag or email and password don't match.";

const signInByTag = async (page: Page, tag: string, password: string) => {
  await page.getByLabel('Tag').fill(tag);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
};

test('signing in by email works, and lands on Home', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Email', exact: true }).click();
  await page.getByLabel('Email').fill(E2E_USER.email);
  await page.getByLabel('Password').fill(E2E_USER.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('signing in by tag works, whatever the @ and the capitals', async ({ page }) => {
  await page.goto('/login');
  await signInByTag(page, ' @E2E ', E2E_USER.password);

  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test('a wrong password and an unknown tag get the same answer', async ({ page }) => {
  await page.goto('/login');
  await signInByTag(page, 'e2e', 'not-the-password');
  await expect(page.locator('.auth-form__error')).toHaveText(MISMATCH);

  await page.getByLabel('Tag').fill('nobody_has_this');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.auth-form__error')).toHaveText(MISMATCH);

  await page.getByRole('tab', { name: 'Email', exact: true }).click();
  await page.getByLabel('Email').fill(E2E_USER.email);
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.auth-form__error')).toHaveText(MISMATCH);
});

test('the Sign in button waits for something to be typed, and there is a note about no reset', async ({ page }) => {
  await page.goto('/login');

  const button = page.getByRole('button', { name: 'Sign in', exact: true });

  await expect(button).toBeDisabled();
  await expect(page.getByText('There is no password reset')).toBeVisible();
  await page.getByLabel('Tag').fill('e2e');
  await expect(button).toBeDisabled();
  await page.getByLabel('Password').fill('x');
  await expect(button).toBeEnabled();
});

test('signing in goes on to the page the person was heading for', async ({ page }) => {
  await page.goto('/habits');
  await expect(page).toHaveURL(/\/login\?next=%2Fhabits$/);

  await signInByTag(page, 'e2e', E2E_USER.password);
  await expect(page).toHaveURL(/\/habits$/);
});

test('five wrong tries lock a tag for a while, even for the right password', async ({ page }) => {
  const user = await createThrowawayUser('zqlock');

  try {
    const { tag } = await getRegistrationRow(user.id);

    await page.goto('/login');

    for (let i = 0; i < 5; i++) {
      await signInByTag(page, tag, 'wrong-password');
      await expect(page.locator('.auth-form__error')).toHaveText(MISMATCH);
    }

    await signInByTag(page, tag, user.password);
    await expect(page.locator('.auth-form__error')).toContainText('Too many tries');
  } finally {
    await deleteUser(user.id);
  }
});

test('creating an account makes it, signs it in and marks it registered, with the tag chosen', async ({ page }) => {
  const email = `zqnew-${Date.now()}@example.com`;

  try {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Create account' }).click();

    await page.getByLabel('Email').fill(email);
    await expect(page.getByLabel('Tag')).toHaveValue(/^zqnew_\d+$/); // from the email, until edited

    await page.getByLabel('Tag').fill('zqnew_me');
    await page.getByLabel('Password', { exact: true }).fill('a-good-password-1');
    await page.getByLabel('Confirm password').fill('a-good-password-1');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();

    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await page.goto('/profile');
    await expect(page.getByText('@zqnew_me').first()).toBeVisible();
    await expect(page.getByText('This account has no password yet')).toHaveCount(0);
  } finally {
    await deleteUserByEmail(email);
  }
});

test('creating an account refuses a tag or an email that is taken, and a password that does not match', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Create account' }).click();

  const create = page.getByRole('button', { name: 'Create account', exact: true });

  await page.getByLabel('Email').fill(`zqtaken-${Date.now()}@example.com`);
  await page.getByLabel('Tag').fill('e2e'); // the shared test account has it
  await page.getByLabel('Password', { exact: true }).fill('a-good-password-1');
  await page.getByLabel('Confirm password').fill('different-password');
  await expect(create).toBeDisabled();

  await page.getByLabel('Confirm password').fill('a-good-password-1');
  await create.click();
  await expect(page.locator('.auth-form__error')).toHaveText('That tag is taken. Try another.');

  await page.getByLabel('Email').fill(E2E_USER.email);
  await page.getByLabel('Tag').fill('zqunused_tag');
  await create.click();
  await expect(page.locator('.auth-form__error')).toContainText('already exists');
});
