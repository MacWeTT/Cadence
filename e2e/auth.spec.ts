import { expect, test, type Page } from '@playwright/test';

test.use({ colorScheme: 'light', storageState: { cookies: [], origins: [] } });

test('the login page offers Google, and GitHub switched off with a note that it is coming', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();

  const github = page.getByRole('button', { name: 'GitHub' });

  await expect(github).toBeDisabled();
  await expect(page.getByText('Coming soon')).toBeVisible();
});

test('unauthenticated visit to Home lands on the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

// Any other page is remembered, so signing in brings the person back to it (an invite link, for one).
for (const path of ['/today', '/habits', '/progress']) {
  test(`unauthenticated visit to ${path} lands on the login page, and remembers where it was going`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}$`));
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });
}

const toggle = (page: Page, name: 'Switch to dark mode' | 'Switch to light mode') => {
  return page.getByRole('button', { name }).click();
};

test('one click flips between light and dark, and it persists after reload', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('html')).not.toHaveClass(/dark/);

  await toggle(page, 'Switch to dark mode');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await toggle(page, 'Switch to light mode');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
});

test('the toggle is one button, with no menu', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  await expect(page.getByRole('menuitemradio')).toHaveCount(0);
});

test('a colour theme applies in both modes and is the only extra class-free choice', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cadence-palette', 'forest-night');
  });
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'forest-night');
  await expect(page.locator('html')).not.toHaveClass(/forest/);
  await expect(page.locator('.login__card')).toHaveCSS('background-color', 'rgb(238, 243, 236)');

  await toggle(page, 'Switch to dark mode');
  await expect(page.locator('.login__card')).toHaveCSS('background-color', 'rgb(31, 40, 34)');
});

test('the tab icon follows the mode, and Forest night has its own dark one', async ({ page }) => {
  const icon = page.locator('link[rel="icon"][type="image/svg+xml"]').first();

  await page.goto('/login');
  await expect(icon).toHaveAttribute('href', /icon-light\.svg/);

  await toggle(page, 'Switch to dark mode');
  await expect(icon).toHaveAttribute('href', /icon-dark\.svg/);

  await page.evaluate(() => {
    window.localStorage.setItem('cadence-palette', 'forest-night');
  });
  await page.reload();
  await expect(icon).toHaveAttribute('href', /icon-forest\.svg/);

  for (const name of ['light', 'dark', 'forest']) {
    expect((await page.request.get(`/brand/icon-${name}.svg`)).ok()).toBe(true);
  }
});
