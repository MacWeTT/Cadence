import { expect, test, type Browser, type BrowserContext } from '@playwright/test';
import { cleanUp, makeCircle, makeLoginFriend, seedHabitFor, shareHabit } from '@e2e/support/circles';
import { adminClient, daysAgo, ensureE2EUser, resetUserData } from '@e2e/support/data';
import { signInState } from '@e2e/support/session';

const made: { circles: string[]; users: string[] } = { circles: [], users: [] };
const extraContexts: BrowserContext[] = [];

test.beforeEach(async () => {
  await resetUserData();
});

test.afterEach(async () => {
  for (const context of extraContexts.splice(0)) {
    await context.close();
  }

  await cleanUp(made);
  made.circles = [];
  made.users = [];
  await resetUserData();
});

/** The e2e user and Sam are in a circle. Sam has a habit, Walk, ticked today and on the two days before. */
const setup = async (browser: Browser, baseURL: string | undefined) => {
  const me = await ensureE2EUser();
  const sam = await makeLoginFriend('Sam');
  const circle = await makeCircle('Study group', me, [sam.id]);
  const storageState = await signInState(sam.email, sam.password);
  const context = await browser.newContext({ baseURL, storageState, reducedMotion: 'reduce' });
  const walk = await seedHabitFor({
    userId: sam.id,
    name: 'Walk',
    icon: '🚶',
    startDate: daysAgo(10),
    ticks: [daysAgo(0), daysAgo(1), daysAgo(2)],
  });

  made.users.push(sam.id);
  made.circles.push(circle);
  extraContexts.push(context);

  return { me, sam, circle, walk, friend: await context.newPage() };
};

test('what a friend shares grows with the level, and a miss is never shown', async ({ page, browser, baseURL }) => {
  const { circle, walk } = await setup(browser, baseURL);
  const card = page.getByRole('listitem').filter({ hasText: 'Sam' });

  await page.goto(`/circles/${circle}`);
  await expect(card).toContainText('Nothing shared with you yet.', { timeout: 20_000 }); // the page compiles on first use

  await shareHabit({ habitId: walk, circleId: circle, level: 'showed_up' });
  await page.reload();
  await expect(card).toContainText('Showed up this week');
  await expect(card).not.toContainText('Walk');

  await adminClient().from('habit_shares').update({ level: 'done_today' }).eq('habit_id', walk);
  await page.reload();
  await expect(card).toContainText('Walk');
  await expect(card).toContainText('Done today');
  await expect(card).not.toContainText('streak');

  await adminClient().from('habit_shares').update({ level: 'streaks' }).eq('habit_id', walk);
  await page.reload();
  await expect(card).toContainText('3-day streak');
  await expect(card.getByRole('img')).toHaveCount(0);

  await adminClient().from('habit_shares').update({ level: 'everything' }).eq('habit_id', walk);
  await page.reload();
  await expect(card.getByRole('img', { name: /3 days ticked in the last 12 weeks/ })).toBeVisible();
  await expect(card).not.toContainText(/miss/i);
});

test('a cheer reaches the friend, once a day, and shows on their own card', async ({ page, browser, baseURL }) => {
  const { circle, walk, friend } = await setup(browser, baseURL);

  await shareHabit({ habitId: walk, circleId: circle, level: 'done_today' });
  await page.goto(`/circles/${circle}`);
  await page.getByRole('button', { name: 'Cheer Sam on' }).click();

  await expect(page.getByText('You cheered them today.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cheer Sam on' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('You cheered them today.')).toBeVisible();

  await friend.goto(`/circles/${circle}`);
  await expect(friend.getByText(/Cheered today by @/)).toBeVisible();
});

test('turning cheers off removes the button for friends, and the choice is kept', async ({
  page,
  browser,
  baseURL,
}) => {
  const { circle, walk, friend } = await setup(browser, baseURL);

  await shareHabit({ habitId: walk, circleId: circle, level: 'done_today' });
  await page.goto(`/circles/${circle}`);

  const option = page.getByLabel('Let friends cheer me on');

  await expect(option).toBeChecked();
  await option.uncheck();
  await expect(option).not.toBeChecked();

  await expect
    .poll(async () => {
      await friend.goto(`/circles/${circle}`);
      await expect(friend.getByRole('heading', { level: 1, name: 'Study group' })).toBeVisible();

      return friend.getByRole('button', { name: /^Cheer / }).count();
    })
    .toBe(0);

  await page.reload();
  await expect(page.getByLabel('Let friends cheer me on')).not.toBeChecked();
});

test('a friend who paused sharing shows nothing, only that they are taking a break', async ({
  page,
  browser,
  baseURL,
}) => {
  const { sam, circle, walk } = await setup(browser, baseURL);

  await shareHabit({ habitId: walk, circleId: circle, level: 'everything' });
  await adminClient().from('profiles').update({ circles_paused: true }).eq('user_id', sam.id);
  await page.goto(`/circles/${circle}`);

  const card = page.getByRole('listitem').filter({ hasText: 'Sam' });

  await expect(card).toContainText('Taking a break from sharing.');
  await expect(card).not.toContainText('Walk');
  await expect(page.getByRole('button', { name: 'Cheer Sam on' })).toHaveCount(0);
});

test('a phone-width screen with a shared history has no sideways scroll', async ({ page, browser, baseURL }) => {
  const { circle, walk } = await setup(browser, baseURL);

  await shareHabit({ habitId: walk, circleId: circle, level: 'everything' });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`/circles/${circle}`);
  await expect(page.getByRole('img', { name: /days ticked/ })).toBeVisible();

  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(0);
});
