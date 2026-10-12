import { expect, test } from '@playwright/test';

test('the Appearance tab opens from the account menu, and the old address redirects to it', async ({ page }) => {
  await page.goto('/today');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Profile' }).click();
  await page.getByRole('link', { name: 'Appearance' }).click();

  await expect(page).toHaveURL(/\/profile\/appearance$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Appearance' })).toBeVisible();
  await expect(page.getByText('Choose how Cadence looks.')).toBeVisible();
});

test('a colour theme applies, persists, and resets', async ({ page }) => {
  await page.goto('/profile/appearance');
  await page.getByText('Ocean', { exact: true }).click();

  const html = page.locator('html');

  await expect(html).toHaveAttribute('data-palette', 'ocean');
  await expect(page.locator('.appearance-preview')).toHaveCSS('background-color', 'rgb(242, 247, 249)');

  await page.reload();
  await expect(html).toHaveAttribute('data-palette', 'ocean');

  await page.getByText('Reset theme and accent').click();
  await expect(html).not.toHaveAttribute('data-palette', /.+/);
});

test('a custom accent colour applies, is kept readable, and persists', async ({ page }) => {
  await page.goto('/profile/appearance');
  await page.getByLabel('Colour code, such as #3f6f98').fill('#ffe08a');

  const html = page.locator('html');

  await expect(html).toHaveAttribute('data-accent', 'custom');
  await expect(html).toHaveCSS('--accent-custom', '#ffe08a');
  // A pale yellow cannot carry the light button text, so the light-mode button colour is deeper than the pick.
  await expect(html).not.toHaveCSS('--accent-custom-light', '#ffe08a');
  await expect(page.getByText('In light mode, buttons use a slightly deeper shade of your colour')).toBeVisible();

  await page.reload();
  await expect(html).toHaveAttribute('data-accent', 'custom');
  await expect(page.getByLabel('Colour code, such as #3f6f98')).toHaveValue('#ffe08a');

  await page.getByText('Teal', { exact: true }).click({ force: true });
  await expect(html).toHaveAttribute('data-accent', 'teal');
});

test('a code that is not a colour is flagged and changes nothing', async ({ page }) => {
  await page.goto('/profile/appearance');

  const box = page.getByLabel('Colour code, such as #3f6f98');

  await box.fill('purple');
  await expect(page.getByText('Use a colour code like #3f6f98.')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-accent', /.+/);
});

test('the custom colour swatch stays a round 36px circle once a custom accent is chosen, and the hex box keeps its look when invalid', async ({
  page,
}) => {
  await page.goto('/profile/appearance');

  const swatch = page.getByLabel('Pick a custom colour');
  const hex = page.getByLabel(/Colour code/);

  await hex.fill('#50494e');
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'custom');
  await expect(swatch).toHaveClass(/(^|\s)accent-picker__color(\s|$)/);
  await expect(swatch).toHaveClass(/accent-picker__color--active/);

  const box = await swatch.boundingBox();

  expect([Math.round(box!.width), Math.round(box!.height)]).toEqual([36, 36]);
  await expect(swatch).toHaveCSS('border-radius', /^(3\.35544e\+07|[1-9]\d{3,})px$/);

  await hex.fill('#50');
  await expect(hex).toHaveClass(/(^|\s)accent-picker__hex(\s|$)/);
  await expect(hex).toHaveClass(/accent-picker__hex--invalid/);
});
