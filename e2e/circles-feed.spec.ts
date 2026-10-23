import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { cleanUp, makeCircle, makeLoginFriend, resumeSharing, seedHabitFor, shareHabit } from '@e2e/support/circles';
import { adminClient, daysAgo, ensureE2EUser, resetUserData, seedCompletion, seedHabit } from '@e2e/support/data';
import { signInState } from '@e2e/support/session';

test.setTimeout(90_000); // two browser sessions, and a page that compiles on its first use

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
  await resumeSharing();
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

/** My own habit, Read, ticked today, so my own day is in the conversation. */
const myDay = async () => {
  const read = await seedHabit({ name: 'Read', icon: '📖', startDate: daysAgo(10) });

  await seedCompletion(read, daysAgo(0));

  return read;
};

const feed = (page: Page) => {
  return page.getByRole('log', { name: 'What your friends shared' });
};

const setLevel = async (habitId: string, level: string) => {
  await adminClient().from('habit_shares').update({ level }).eq('habit_id', habitId);
};

test('what a friend shares grows with the level, and a miss is never shown', async ({ page, browser, baseURL }) => {
  const { circle, walk } = await setup(browser, baseURL);

  await page.goto(`/circles/${circle}`);
  await expect(page.getByText('A quiet day so far')).toBeVisible({ timeout: 20_000 }); // the page compiles on first use

  await shareHabit({ habitId: walk, circleId: circle, level: 'showed_up' });
  await page.reload();
  await expect(page.getByText('A quiet day so far')).toBeVisible();

  await setLevel(walk, 'done_today');
  await page.reload();
  await expect(feed(page)).toContainText('Walk');
  await expect(feed(page)).not.toContainText('streak');
  await expect(feed(page)).not.toContainText('Yesterday');

  await setLevel(walk, 'streaks');
  await page.reload();
  await expect(feed(page)).toContainText('3-day streak');
  await expect(feed(page)).not.toContainText('Yesterday');

  await setLevel(walk, 'everything');
  await page.reload();
  await expect(feed(page).getByText('Yesterday', { exact: true })).toBeVisible();
  await expect(feed(page)).not.toContainText(/miss/i);

  await page.getByRole('button', { name: /^See the \d+ (person|people) in this circle$/ }).click();
  await expect(page.getByRole('img', { name: /3 days ticked in the last 12 weeks/ })).toBeVisible();
});

test('reactions: add one, see it on a friend, see theirs on your own day, and take yours back', async ({
  page,
  browser,
  baseURL,
}) => {
  const { circle, walk, friend } = await setup(browser, baseURL);
  const read = await myDay();

  await shareHabit({ habitId: walk, circleId: circle, level: 'done_today' });
  await shareHabit({ habitId: read, circleId: circle, level: 'done_today' });

  await page.goto(`/circles/${circle}`);
  await page.getByRole('button', { name: 'Add a reaction' }).click();
  await page.getByRole('button', { name: 'React with 👏' }).click();

  const mine = page.getByRole('button', { name: '👏 from 1 person' });

  await expect(mine).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(mine).toHaveAttribute('aria-pressed', 'true');

  // Sam sees my reaction on their day, and reacts to my day.
  await friend.goto(`/circles/${circle}`);
  await expect(friend.getByRole('button', { name: '👏 from 1 person' })).toBeVisible({ timeout: 20_000 });
  await friend.getByRole('button', { name: 'Add a reaction' }).click();
  await friend.getByRole('button', { name: 'React with ❤️' }).click();
  await expect(friend.getByRole('button', { name: '❤️ from 1 person' })).toHaveAttribute('aria-pressed', 'true');

  // My own day is on the right, with Sam's heart on it, and I cannot react to myself.
  await expect
    .poll(
      async () => {
        await page.reload();
        await expect(feed(page)).toContainText('Walk');

        return page.getByRole('button', { name: '❤️ from 1 person' }).count();
      },
      { timeout: 20_000 },
    )
    .toBe(1);
  await expect(page.getByRole('button', { name: '❤️ from 1 person' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Add a reaction' })).toHaveCount(1); // only on Sam's day

  await mine.click();
  await expect(mine).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /👏 from/ })).toHaveCount(0);
});

test('turning reactions off removes the button for friends, and the choice is kept', async ({
  page,
  browser,
  baseURL,
}) => {
  const { circle, friend } = await setup(browser, baseURL);
  const read = await myDay();

  await shareHabit({ habitId: read, circleId: circle, level: 'done_today' });
  await friend.goto(`/circles/${circle}`);
  await expect(friend.getByRole('button', { name: 'Add a reaction' })).toBeVisible({ timeout: 20_000 });

  await page.goto(`/circles/${circle}`);
  await page.getByRole('button', { name: 'What I share', exact: true }).click();

  const option = page.getByLabel('Let friends react to me');

  await expect(option).toBeChecked();
  await option.click();
  await expect(option).not.toBeChecked();

  await expect
    .poll(async () => {
      await friend.reload();
      await expect(friend.getByRole('heading', { level: 1, name: 'Study group' })).toBeVisible();

      return friend.getByRole('button', { name: 'Add a reaction' }).count();
    })
    .toBe(0);

  await page.reload();
  await page.getByRole('button', { name: 'What I share', exact: true }).click();
  await expect(page.getByLabel('Let friends react to me')).not.toBeChecked();
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

  await expect(page.getByText('A quiet day so far')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Walk')).toHaveCount(0);

  await page.getByRole('button', { name: /^See the \d+ (person|people) in this circle$/ }).click();
  await expect(page.getByRole('dialog').getByText('Taking a break from sharing.')).toBeVisible();
});

test('your colour and pin are your own: the pinned circle comes first for you, and not for a friend', async ({
  page,
  browser,
  baseURL,
}) => {
  const { me, sam, friend } = await setup(browser, baseURL);
  const second = await makeCircle('Another circle', me, [sam.id]);

  made.circles.push(second);
  await page.goto(`/circles/${second}`);
  await page.getByRole('button', { name: 'Circle settings' }).click();
  await page.getByRole('radio', { name: 'Sky' }).click();
  await expect(page.getByRole('radio', { name: 'Sky' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('switch', { name: /Pin to the top/ }).click();
  await expect(page.getByRole('switch', { name: /Pin to the top/ })).toBeChecked();

  await page.reload();
  await page.getByRole('button', { name: 'Circle settings' }).click();
  await expect(page.getByRole('radio', { name: 'Sky' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: /Pin to the top/ })).toBeChecked();

  await page.goto('/circles');

  const mineList = page.getByRole('navigation', { name: 'Your circles' }).getByRole('link');

  await expect(mineList.first()).toContainText('Another circle', { timeout: 20_000 });
  await expect(mineList.first().getByLabel('Pinned')).toBeVisible();

  await friend.goto('/circles');

  const theirs = friend.getByRole('navigation', { name: 'Your circles' }).getByRole('link');

  await expect(theirs.first()).toContainText('Study group', { timeout: 20_000 });
  await expect(friend.getByLabel('Pinned')).toHaveCount(0);
});

test('a phone-width conversation with a shared history has no sideways scroll', async ({ page, browser, baseURL }) => {
  const { circle, walk } = await setup(browser, baseURL);

  await shareHabit({ habitId: walk, circleId: circle, level: 'everything' });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`/circles/${circle}`);
  await expect(feed(page)).toContainText('Walk', { timeout: 20_000 });

  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(0);
});
