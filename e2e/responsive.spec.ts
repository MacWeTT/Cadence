import { expect, test, type Page } from '@playwright/test';
import { daysAgo, resetUserData, seedCompletion, seedHabit } from '@e2e/support/data';

const SIZES = [
  { name: 'a small phone', width: 320, height: 640 },
  { name: 'a phone', width: 390, height: 844 },
  { name: 'a phone on its side', width: 844, height: 390 },
  { name: 'a tablet', width: 768, height: 1024 },
];

const PAGES = [
  '/',
  '/today',
  '/habits',
  '/progress',
  '/profile',
  '/profile/appearance',
  '/profile/notifications',
  '/profile/account',
  '/about',
  '/contact',
  '/changelog',
];

const sidewaysScroll = (page: Page) => {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth - window.innerWidth;
  });
};

test.beforeEach(async () => {
  await resetUserData();
  const long = await seedHabit({ name: 'Read before bed for thirty minutes without a phone', startDate: daysAgo(40) });

  await seedHabit({ name: 'Gym', startDate: daysAgo(40), kind: 'weekdays', weekdays: [1, 3, 5] });
  await seedHabit({ name: 'Run', startDate: daysAgo(40), kind: 'weekly_count', timesPerWeek: 3 });
  await seedHabit({ name: 'Call mum', startDate: daysAgo(40), kind: 'optional' });

  for (let i = 1; i < 12; i++) {
    await seedCompletion(long, daysAgo(i));
  }
});

for (const { name, width, height } of SIZES) {
  test(`no page scrolls sideways on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });

    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole('contentinfo')).toBeVisible();
      await page.waitForTimeout(400); // the page's own data has been drawn

      expect(await sidewaysScroll(page), `${path} on ${name}`).toBeLessThanOrEqual(0);
    }
  });
}

test('a phone gets a tab bar at the foot of the screen, and no links in the top bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/habits');

  const tabs = page.getByRole('navigation', { name: 'Main' });

  await expect(tabs.getByRole('link')).toHaveText(['Home', 'Today', 'Habits', 'Progress']);
  await expect(tabs.getByRole('link', { name: 'Habits' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('header.top-bar').getByRole('link', { name: 'Today' })).toBeHidden();

  for (const link of await tabs.getByRole('link').all()) {
    expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }

  await tabs.getByRole('link', { name: 'Progress' }).click();
  await expect(page).toHaveURL(/\/progress$/);
});

test('a tablet keeps the links in the top bar, and no tab bar', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/habits');

  await expect(page.locator('header.top-bar').getByRole('link', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
});

test('the habit dialog fits a phone, also on its side', async ({ page }) => {
  for (const [width, height] of [
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/habits');
    await page.getByRole('button', { name: 'New habit' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'New habit' });
    const box = await dialog.boundingBox();

    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    expect(box?.y).toBeGreaterThanOrEqual(0);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height);
    await page.keyboard.press('Escape');
  }
});

test('the loading skeletons fit a small phone too', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });

  // Hold the page data back so the skeleton stays on screen long enough to measure.
  await page.route(/\/api\/(progress|home)/, async route => {
    await new Promise(resolve => {
      setTimeout(resolve, 2500);
    });
    await route.continue();
  });

  for (const path of ['/progress', '/']) {
    await page.goto(path);
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();

    expect(await sidewaysScroll(page), `${path} while loading`).toBeLessThanOrEqual(0);
  }
});
