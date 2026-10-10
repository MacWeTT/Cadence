import { expect, test } from '@playwright/test';
import { daysAgo, resetUserData, seedHabit } from './support/data';

test('the footer sits at the bottom of the window, on a long page and on a short one', async ({ page }) => {
  await resetUserData();

  for (let i = 0; i < 25; i++) {
    await seedHabit({ name: `Habit ${i}`, startDate: daysAgo(10) });
  }

  await page.setViewportSize({ width: 1280, height: 700 });

  const footer = page.getByRole('contentinfo');

  const bottom = async () => {
    const box = await footer.boundingBox();

    return Math.round(box!.y + box!.height);
  };

  await page.goto('/habits');
  await expect(footer).toBeVisible();
  expect(await bottom()).toBe(700);

  await page.goto('/about');
  await expect(footer).toBeVisible();
  expect(await bottom()).toBe(700);
});
