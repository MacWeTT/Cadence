import { expect, test } from '@playwright/test';
import { E2E_USER } from './support/data';
import { signInState } from './support/session';

// Each test gets its own session, so signing out never invalidates the shared one.
test.beforeEach(async ({ context }) => {
  const state = await signInState(E2E_USER.email, E2E_USER.password);
  await context.clearCookies();
  await context.addCookies(state.cookies);
});

test('the account menu shows the user and can be dismissed', async ({ page }) => {
  await page.goto('/today');
  await page.getByRole('button', { name: 'Account menu' }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toContainText('E2E User');
  await expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();

  await page.mouse.click(300, 600); // outside click (Radix blocks pointer events on the page while a menu is open)
  await expect(menu).toBeHidden();

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
});

test('signing out lands on the login page and protects the app again', async ({ page }) => {
  await page.goto('/today');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/today');
  await expect(page).toHaveURL(/\/login$/);
});
