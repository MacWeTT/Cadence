import { expect, test } from '@playwright/test';

const signedOut = { cookies: [], origins: [] };

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the first app page of a session opens with the splash, which fades away, and it does not repeat', async ({
    page,
  }) => {
    await page.goto('/today');
    await expect(page.locator('.app-splash')).toBeVisible();
    await expect(page.locator('.app-splash')).toHaveCount(0, { timeout: 10_000 });

    await page.goto('/habits');
    await expect(page.getByRole('heading', { name: 'Habits', level: 1 })).toBeVisible();
    await expect(page.locator('.app-splash')).toHaveCount(0);
  });

  test.describe('the login page', () => {
    test.use({ storageState: signedOut });

    test('has its own logo animation, with no splash on top of it', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('.app-splash')).toHaveCount(0);

      const logo = page.getByRole('heading', { name: 'Cadence' }).getByRole('img', { name: 'Cadence' });

      await expect(logo.locator('.animated-logo__letter').last()).toHaveCSS('opacity', '1', { timeout: 10_000 });
      await expect(logo.locator('.animated-logo__ring')).toHaveCSS('opacity', '1');
      await expect(logo.locator('.animated-logo__dot')).toHaveCSS('opacity', '1');
    });
  });
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce', storageState: signedOut });

  test('there is no splash and the login logo is shown finished straight away', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('.app-splash')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Cadence' }).locator('svg.logo')).toBeVisible();
  });
});
