import { expect, test } from '@playwright/test';

// The privacy policy and the terms are public: Google (and anyone deciding whether to sign up) must be able to read them
// without an account.
test.use({ storageState: { cookies: [], origins: [] } });

test('the privacy policy opens without signing in, and says what is kept, where, and how to leave', async ({
  page,
}) => {
  await page.goto('/privacy');

  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page).toHaveTitle('Privacy policy · Cadence');
  await expect(page.getByRole('heading', { name: 'Privacy policy', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What we keep' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where it is kept' })).toBeVisible();
  await expect(page.getByText(/Tokyo/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your choices' })).toBeVisible();
  await expect(page.getByText(/Google API Services User Data Policy/)).toBeVisible();
});

test('the terms open without signing in, and say what the service is and is not', async ({ page }) => {
  await page.goto('/terms');

  await expect(page).toHaveURL(/\/terms$/);
  await expect(page).toHaveTitle('Terms of use · Cadence');
  await expect(page.getByRole('heading', { name: 'Terms of use', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No promises about availability' })).toBeVisible();
});

test('the sign-in page and the footer lead to both, and each has a way back', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Privacy policy' }).first().click();
  await expect(page).toHaveURL(/\/privacy$/);

  await page.getByRole('contentinfo').getByRole('link', { name: 'Terms of use' }).click();
  await expect(page).toHaveURL(/\/terms$/);

  await page.getByRole('link', { name: 'Back to Cadence' }).click();
  await expect(page).toHaveURL(/\/login/);
});
