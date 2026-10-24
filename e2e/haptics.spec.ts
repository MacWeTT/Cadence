import { expect, test, type Page } from '@playwright/test';
import { cleanUp, makeCircle, makeLoginFriend, makePair, seedHabitFor, shareHabit } from '@e2e/support/circles';
import { daysAgo, ensureE2EUser, resetUserData, seedHabit } from '@e2e/support/data';

// Haptics come from the browser's vibration, which a test browser cannot feel, so these specs stand in a recorder for
// it and read what the page asked for.

declare global {
  interface Window {
    __buzz: (number | number[])[];
  }
}

const record = async (page: Page) => {
  await page.addInitScript(() => {
    window.__buzz = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number | number[]) => {
        window.__buzz.push(pattern);

        return true;
      },
    });
  });
};

const buzzes = (page: Page) => {
  return page.evaluate(() => {
    return window.__buzz;
  });
};

const check = (page: Page, name: string) => {
  return page.getByRole('checkbox', { name: `Mark ${name} done` });
};

test.beforeEach(async () => {
  await resetUserData();
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await seedHabit({ name: 'Run', startDate: daysAgo(5) });
});

test.afterEach(async () => {
  await resetUserData();
});

test.describe('with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('ticking a habit taps once, the last habit of the day taps harder, and taking a tick back is quiet', async ({
    page,
  }) => {
    await record(page);
    await page.goto('/today');

    await check(page, 'Read').click();
    await expect
      .poll(() => {
        return buzzes(page);
      })
      .toEqual([10]);

    await check(page, 'Run').click();
    await expect
      .poll(() => {
        return buzzes(page);
      })
      .toEqual([10, [12, 40, 12]]);

    await page.getByRole('checkbox', { name: 'Mark Read not done' }).click();
    await expect(check(page, 'Read')).toBeVisible();
    expect(await buzzes(page)).toEqual([10, [12, 40, 12]]);
  });
});

test.describe('in Circles, with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('a reaction taps once when given and is quiet when taken back, and Closer taps when turned on', async ({
    page,
  }) => {
    const me = await ensureE2EUser();
    const sam = await makeLoginFriend('Sam');
    const circle = await makeCircle('Study group', me, [sam.id]);
    const pair = await makePair(me, sam.id);
    const walk = await seedHabitFor({ userId: sam.id, name: 'Walk', startDate: daysAgo(5), ticks: [daysAgo(0)] });

    try {
      await shareHabit({ habitId: walk, circleId: circle, level: 'done_today' });
      await record(page);
      await page.goto(`/circles/${circle}`);
      await page.getByRole('button', { name: 'Add a reaction' }).click();
      await page.getByRole('button', { name: 'React with 👏' }).click();
      await expect
        .poll(() => {
          return buzzes(page);
        })
        .toEqual([10]);

      await page.getByRole('button', { name: '👏 from 1 person' }).click();
      await expect(page.getByRole('button', { name: '👏 from 1 person' })).toHaveCount(0);
      expect(await buzzes(page)).toEqual([10]);

      await page.goto(`/circles/${pair}`);
      await page.getByRole('button', { name: 'What I share', exact: true }).click();

      const closer = page.getByRole('switch', { name: /Let us see each other's off days/ });

      await closer.click();
      await expect(closer).toBeChecked();
      expect(await buzzes(page)).toEqual([8]);

      await closer.click();
      await expect(closer).not.toBeChecked();
      expect(await buzzes(page)).toEqual([8]);
    } finally {
      await cleanUp({ circles: [circle, pair], users: [sam.id] });
    }
  });
});

test('a person who prefers reduced motion feels nothing', async ({ page }) => {
  await record(page);
  await page.goto('/today');
  await check(page, 'Read').click();
  await expect(page.getByRole('checkbox', { name: 'Mark Read not done' })).toBeVisible();

  expect(await buzzes(page)).toEqual([]);
});

test('a browser that cannot vibrate is left alone: ticking still works', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined });
  });
  await page.goto('/today');
  await check(page, 'Read').click();

  await expect(page.getByRole('checkbox', { name: 'Mark Read not done' })).toBeVisible();
});
