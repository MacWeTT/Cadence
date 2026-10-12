import { expect, test } from '@playwright/test';
import { E2E_USER } from '@e2e/support/data';
import { signInState } from '@e2e/support/session';

// Each test gets its own session, so signing out never invalidates the shared one.
test.beforeEach(async ({ context }) => {
  const state = await signInState(E2E_USER.email, E2E_USER.password);

  await context.clearCookies();
  await context.addCookies(state.cookies);
});

test('the avatar in the top bar opens the profile', async ({ page }) => {
  await page.goto('/today');
  await page.getByRole('banner').getByRole('link', { name: 'Profile' }).click();

  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('signing out from the profile lands on the login page and protects the app again', async ({ page }) => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/today');
  await expect(page).toHaveURL(/\/login$/);
});
