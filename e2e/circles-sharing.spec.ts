import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { cleanUp, makeCircle, makeFriend, makeLoginFriend, resumeSharing } from '@e2e/support/circles';
import { daysAgo, ensureE2EUser, resetUserData, seedHabit } from '@e2e/support/data';
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
  await resumeSharing();
  made.circles = [];
  made.users = [];
  await resetUserData();
});

/** The e2e user owns a circle with Sam in it, and has a habit called Read. Sam has their own browser session. */
const setup = async (browser: Browser, baseURL: string | undefined) => {
  const me = await ensureE2EUser();
  const sam = await makeLoginFriend('Sam');
  const circle = await makeCircle('Study group', me, [sam.id]);
  const storageState = await signInState(sam.email, sam.password);
  const context = await browser.newContext({ baseURL, storageState, reducedMotion: 'reduce' });

  made.users.push(sam.id);
  made.circles.push(circle);
  extraContexts.push(context);
  await seedHabit({ name: 'Read', icon: '📖', startDate: daysAgo(10) });

  return { me, circle, friend: await context.newPage() };
};

/** Opens "What I share", which is a window of its own on the circle page. */
const openSharing = async (page: Page) => {
  await page.getByRole('button', { name: 'What I share', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What I share here' })).toBeVisible({ timeout: 20_000 }); // the page compiles on first use
};

/** The habits of mine that Sam sees in the circle, read as Sam. */
const whatSamSees = async (friend: Page, circle: string, me: string) => {
  const response = await friend.request.get(`/api/circles/${circle}`);
  const body = await response.json();
  const mine = body.members.find((member: { userId: string }) => {
    return member.userId === me;
  });

  return mine.habits.map((habit: { name: string | null; icon: string | null; level: string }) => {
    return { name: habit.name, icon: habit.icon, level: habit.level };
  });
};

test('nothing is shared until the person chooses, and the page says so', async ({ page, browser, baseURL }) => {
  const { me, circle, friend } = await setup(browser, baseURL);

  await page.goto(`/circles/${circle}`);
  await openSharing(page);

  await expect(page.getByLabel('How much of Read this circle sees')).toHaveValue('hidden');
  await expect(page.getByText('This circle sees nothing about this habit.')).toBeVisible();
  expect(await whatSamSees(friend, circle, me)).toEqual([]);
});

test('choosing a level shows that much of the habit to the circle, and taking it back hides it again', async ({
  page,
  browser,
  baseURL,
}) => {
  const { me, circle, friend } = await setup(browser, baseURL);

  await page.goto(`/circles/${circle}`);
  await openSharing(page);
  await page.getByLabel('How much of Read this circle sees').selectOption('done_today');

  await expect(page.getByText('They see this habit and whether you did it today.')).toBeVisible();
  await expect
    .poll(() => {
      return whatSamSees(friend, circle, me);
    })
    .toEqual([{ name: 'Read', icon: '📖', level: 'done_today' }]);

  await page.reload();
  await openSharing(page);
  await expect(page.getByLabel('How much of Read this circle sees')).toHaveValue('done_today');

  await page.getByLabel('How much of Read this circle sees').selectOption('hidden');
  await expect
    .poll(() => {
      return whatSamSees(friend, circle, me);
    })
    .toEqual([]);
});

test('a habit can be shown by its emoji only, or as just a habit', async ({ page, browser, baseURL }) => {
  const { me, circle, friend } = await setup(browser, baseURL);

  await page.goto(`/circles/${circle}`);
  await openSharing(page);
  await page.getByLabel('How much of Read this circle sees').selectOption('done_today');
  await page.getByLabel('How Read is shown to this circle').selectOption('emoji');
  await expect
    .poll(() => {
      return whatSamSees(friend, circle, me);
    })
    .toEqual([{ name: null, icon: '📖', level: 'done_today' }]);

  await page.getByLabel('How Read is shown to this circle').selectOption('generic');
  await expect
    .poll(() => {
      return whatSamSees(friend, circle, me);
    })
    .toEqual([{ name: null, icon: null, level: 'done_today' }]);
});

test('one person can be given more or less than the rest, and the circle level applies again on "Same as the circle"', async ({
  page,
  browser,
  baseURL,
}) => {
  const { me, circle, friend } = await setup(browser, baseURL);

  await page.goto(`/circles/${circle}`);
  await openSharing(page);
  await page.getByLabel('How much of Read this circle sees').selectOption('done_today');
  await page.getByRole('button', { name: 'Customise Read for one person' }).click();
  await page.getByLabel('What Sam sees').selectOption('hidden');
  await expect
    .poll(() => {
      return whatSamSees(friend, circle, me);
    })
    .toEqual([]);

  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: 'Customised for 1' })).toBeVisible();

  await page.getByRole('button', { name: 'Customised for 1' }).click();
  await page.getByLabel('What Sam sees').selectOption('inherit');
  await expect
    .poll(() => {
      return whatSamSees(friend, circle, me);
    })
    .toEqual([{ name: 'Read', icon: '📖', level: 'done_today' }]);
});

test('pausing hides everything from the circle and keeps the choices', async ({ page, browser, baseURL }) => {
  const { me, circle, friend } = await setup(browser, baseURL);

  await page.goto(`/circles/${circle}`);
  await openSharing(page);
  await page.getByLabel('How much of Read this circle sees').selectOption('streaks');
  await expect
    .poll(() => {
      return whatSamSees(friend, circle, me);
    })
    .toHaveLength(1);

  await page.getByRole('switch', { name: /Pause sharing/ }).click();
  await expect
    .poll(() => {
      return whatSamSees(friend, circle, me);
    })
    .toEqual([]);

  await page.reload();
  await openSharing(page);
  await expect(page.getByRole('switch', { name: /Pause sharing/ })).toBeChecked();
  await expect(page.getByLabel('How much of Read this circle sees')).toHaveValue('streaks');

  await page.getByRole('switch', { name: /Pause sharing/ }).click();
  await expect
    .poll(() => {
      return whatSamSees(friend, circle, me);
    })
    .toHaveLength(1);
});

test('a very long habit name still fits a phone-width screen', async ({ page, browser, baseURL }) => {
  const { circle } = await setup(browser, baseURL);

  await seedHabit({ name: 'Read a chapter of something wonderfully long and winding', startDate: daysAgo(3) });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`/circles/${circle}`);
  await openSharing(page);
  await page
    .getByLabel('How much of Read a chapter of something wonderfully long and winding this circle sees')
    .selectOption('everything');
  await page.getByRole('button', { name: /Customise Read a chapter/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');

  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(0);
});

test('the sharing endpoint is closed to people outside the circle', async ({ request }) => {
  const stranger = await makeFriend('kim');
  const circle = await makeCircle('Not yours', stranger, []);

  made.users.push(stranger);
  made.circles.push(circle);

  expect((await request.get(`/api/circles/${circle}/sharing`)).status()).toBe(404);
  expect((await request.get('/api/circles/not-an-id/sharing')).status()).toBe(404);
});

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the sharing endpoint needs a sign-in', async ({ request }) => {
    expect((await request.get('/api/circles/00000000-0000-4000-8000-00000000dead/sharing')).status()).toBe(401);
  });
});
