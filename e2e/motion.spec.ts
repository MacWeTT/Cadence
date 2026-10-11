import { expect, test, type Page } from '@playwright/test';
import { daysAgo, resetUserData, seedCompletion, seedHabit, setWeekStartForTests } from '@e2e/support/data';

test.beforeEach(async ({ page }) => {
  await resetUserData();
  await setWeekStartForTests();
  await page.addInitScript(() => {
    return window.sessionStorage.setItem('cadence:splash', '1'); // not under test here
  });
});

const seed = async () => {
  const read = await seedHabit({ name: 'Read', startDate: daysAgo(10) });

  await seedHabit({ name: 'Run', startDate: daysAgo(10) });
  await seedCompletion(read, daysAgo(1));
};

const progressAngle = (page: Page) => {
  return page.getByRole('img', { name: /of [0-9]+ done today/ });
};

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  for (const path of ['/', '/today', '/habits', '/progress', '/about']) {
    test(`${path}: the page ends up fully shown when it moves in`, async ({ page }) => {
      await seed();
      await page.goto(path);

      const main = page.getByRole('main');

      await expect(main.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('.skeleton')).toHaveCount(0);
      await expect(main).toHaveCSS('opacity', '1');
    });
  }

  for (const path of ['/about', '/changelog']) {
    test(`${path}: its blocks come in one after another and every one ends fully shown`, async ({ page }) => {
      await page.goto(path);

      const blocks = page.locator('.arrive');

      expect(await blocks.count()).toBeGreaterThan(2);

      for (const block of await blocks.all()) {
        await expect(block).toHaveCSS('opacity', '1', { timeout: 5000 });
      }
    });
  }

  test('moving between pages with the links keeps every page usable', async ({ page }) => {
    await seed();
    await page.goto('/today');

    for (const name of ['Habits', 'Progress', 'Today']) {
      await page.getByRole('banner').getByRole('link', { name }).click();
      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
    }
  });

  test("Home: the progress ring fills to the day's share, and ticking a habit moves it to Done", async ({ page }) => {
    await seed();
    await page.goto('/');
    await expect(progressAngle(page)).toHaveAttribute('aria-label', '0 of 2 done today');
    await expect(progressAngle(page)).toHaveCSS('background-image', /conic-gradient\(.* 0deg/);

    await page.getByRole('checkbox', { name: 'Mark Read done' }).click();
    await expect(page.getByRole('list', { name: 'Done today' }).getByRole('listitem')).toContainText('Read');
    await expect(progressAngle(page)).toHaveAttribute('aria-label', '1 of 2 done today');
    await expect(progressAngle(page)).toHaveCSS('background-image', /conic-gradient\(.* 180deg/, { timeout: 5000 });
  });

  test('the alert banner fades in once the clock is known', async ({ page }) => {
    await seed();
    await page.goto('/');

    const banner = page.getByTestId('banner');

    await expect(banner).toBeVisible();
    await expect(banner).toHaveCSS('opacity', '1', { timeout: 5000 });
  });
});
