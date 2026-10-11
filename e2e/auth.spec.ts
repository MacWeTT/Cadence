import { expect, test, type Page } from '@playwright/test';

test.use({ colorScheme: 'light', storageState: { cookies: [], origins: [] } });

for (const path of ['/', '/today', '/habits', '/progress']) {
  test(`unauthenticated visit to ${path} lands on the login page`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });
}

const chooseTheme = async (page: Page, name: string) => {
  await page.getByRole('button', { name: 'Choose theme' }).click();
  await page.getByRole('menuitemradio', { name }).click();
};

test('the theme menu offers one light and two dark themes', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Choose theme' }).click();

  for (const name of ['Paper', 'Slate', 'Forest night']) {
    await expect(page.getByRole('menuitemradio', { name })).toBeVisible();
  }

  await expect(page.getByRole('menuitemradio', { name: 'Paper' })).toBeChecked();
});

test('Slate is the dark theme and persists after reload', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('html')).not.toHaveClass(/dark|forest/);
  await chooseTheme(page, 'Slate');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('Forest night is a dark theme of its own, and Paper brings the light one back', async ({ page }) => {
  await page.goto('/login');
  await chooseTheme(page, 'Forest night');
  await expect(page.locator('html')).toHaveClass(/forest/);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  // dark: variants still apply to it
  await expect(page.locator('.login__card')).toHaveCSS('background-color', 'rgb(31, 40, 34)');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/forest/);

  await chooseTheme(page, 'Paper');
  await expect(page.locator('html')).not.toHaveClass(/dark|forest/);
  await expect(page.locator('html')).not.toHaveClass(/theme-transition/);
});
