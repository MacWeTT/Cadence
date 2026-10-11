import { expect, test } from '@playwright/test';
import { daysAgo, resetUserData, seedHabit } from '@e2e/support/data';

test('the footer is at the bottom of the window on a short page and after the content on a long one, never over it', async ({
  page,
}) => {
  await resetUserData();

  for (let i = 0; i < 25; i++) {
    await seedHabit({ name: `Habit ${i}`, startDate: daysAgo(10) });
  }

  await page.setViewportSize({ width: 1280, height: 1000 });

  const footer = page.getByRole('contentinfo');

  const box = async (locator: typeof footer) => {
    const { y, height } = (await locator.boundingBox())!;

    return { top: Math.round(y), bottom: Math.round(y + height) };
  };

  // Short: the footer rests on the bottom edge of the window.
  await page.goto('/about');
  await expect(footer).toBeVisible();
  expect((await box(footer)).bottom).toBe(1000);

  // Long: the footer starts where the content ends (nothing is hidden under it, nothing can slide over it).
  await page.goto('/habits');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('listitem').first()).toBeVisible();
  expect((await box(footer)).top).toBeGreaterThanOrEqual((await box(page.getByRole('main'))).bottom);
});
