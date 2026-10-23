import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  cleanUp,
  cleanUpByName,
  makeCircle,
  makeLoginFriend,
  makePair,
  resumeSharing,
  seedHabitFor,
  shareHabit,
} from '@e2e/support/circles';
import { daysAgo, ensureE2EUser, resetUserData } from '@e2e/support/data';
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

  await cleanUpByName('Partners');
  await cleanUp(made);
  await resumeSharing();
  made.circles = [];
  made.users = [];
  await resetUserData();
});

/** A person who can sign in, in their own browser session. */
const session = async (browser: Browser, baseURL: string | undefined, label: string) => {
  const person = await makeLoginFriend(label);
  const storageState = await signInState(person.email, person.password);
  const context = await browser.newContext({ baseURL, storageState, reducedMotion: 'reduce' });

  made.users.push(person.id);
  extraContexts.push(context);

  return { id: person.id, page: await context.newPage() };
};

const sharingDialog = async (page: Page) => {
  await page.getByRole('button', { name: 'What I share', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What I share here' })).toBeVisible({ timeout: 20_000 });
};

const offMarks = (page: Page) => {
  return page.getByTitle("Didn't happen");
};

test('a pair is started from the list, waits for the partner, and holds only two people', async ({
  page,
  browser,
  baseURL,
}) => {
  const sam = await session(browser, baseURL, 'Sam');
  const kim = await session(browser, baseURL, 'Kim');

  await page.goto('/circles');
  await page.getByRole('button', { name: 'Invite a partner' }).click();
  await expect(page).toHaveURL(/\/circles\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Waiting for your partner' })).toBeVisible();

  await page.getByRole('button', { name: 'Get the invite link' }).click();

  const field = page.getByLabel('Invite link');

  await expect(field).toHaveValue(/\/circles\/join\/[0-9a-f]{64}$/);

  const link = await field.inputValue();

  await sam.page.goto(link);
  await expect(sam.page.getByRole('heading', { name: 'Be partners with E2E User?' })).toBeVisible({ timeout: 20_000 });
  await sam.page.getByRole('button', { name: 'Join circle' }).click();
  await expect(sam.page).toHaveURL(/\/circles\/[0-9a-f-]{36}$/);
  await expect(sam.page.getByRole('heading', { level: 1, name: 'E2E User' })).toBeVisible();

  // The pair is two people: a third who opens the link is told it is full.
  await kim.page.goto(link);
  await expect(kim.page.getByText('This circle is full')).toBeVisible({ timeout: 20_000 });
  await expect(kim.page.getByRole('button', { name: 'Join circle' })).toBeDisabled();

  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Sam' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Week together')).toBeVisible();

  await page.goto('/circles');

  const row = page.getByRole('navigation', { name: 'Your circles' }).getByRole('link', { name: /Sam/ });

  await expect(row).toContainText('Partner', { timeout: 20_000 });
});

test('Closer needs both of you, and off days show only for the habits chosen', async ({ page, browser, baseURL }) => {
  const me = await ensureE2EUser();
  const sam = await session(browser, baseURL, 'Sam');
  const pair = await makePair(me, sam.id);
  const walk = await seedHabitFor({
    userId: sam.id,
    name: 'Walk',
    startDate: daysAgo(10),
    ticks: [daysAgo(0), daysAgo(2), daysAgo(3)],
  });

  made.circles.push(pair);
  await shareHabit({ habitId: walk, circleId: pair, level: 'everything' });

  // Sam turns Closer on and chooses Walk. On its own that shows me nothing.
  await sam.page.goto(`/circles/${pair}`);
  await sharingDialog(sam.page);

  const samSwitch = sam.page.getByRole('switch', { name: /Let us see each other's off days/ });

  await samSwitch.click();
  await expect(samSwitch).toBeChecked();
  await expect(sam.page.getByText('Waiting for E2E User to turn it on too.')).toBeVisible();
  await sam.page.getByLabel('Show my off days for this one').click();
  await expect(sam.page.getByLabel('Show my off days for this one')).toBeChecked();

  await page.goto(`/circles/${pair}`);
  await expect(page.getByText('Week together')).toBeVisible({ timeout: 20_000 });
  await expect(offMarks(page)).toHaveCount(0);

  // I turn mine on: now it is on for both, and Sam's off days appear.
  await sharingDialog(page);

  const mySwitch = page.getByRole('switch', { name: /Let us see each other's off days/ });

  await mySwitch.click();
  await expect(mySwitch).toBeChecked();
  await expect(page.getByText(/On for both of you/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect
    .poll(
      async () => {
        await page.reload();
        await expect(page.getByText('Week together')).toBeVisible();

        return offMarks(page).count();
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);

  // Either of us turning it off ends it for both, at once.
  await sharingDialog(page);
  await mySwitch.click();
  await expect(mySwitch).not.toBeChecked();
  await page.keyboard.press('Escape');
  await expect
    .poll(
      async () => {
        await page.reload();
        await expect(page.getByText('Week together')).toBeVisible();

        return offMarks(page).count();
      },
      { timeout: 20_000 },
    )
    .toBe(0);

  const view = await (await page.request.get(`/api/circles/${pair}`)).json();
  const partner = view.members.find((member: { isYou: boolean }) => {
    return !member.isYou;
  });

  expect(view).toMatchObject({ kind: 'pair', closerActive: false });
  expect(
    partner.habits.every((habit: { missed: unknown }) => {
      return habit.missed === null;
    }),
  ).toBe(true);
});

test('an ordinary circle has no Closer and no Week together', async ({ page }) => {
  const me = await ensureE2EUser();
  const friend = await makeLoginFriend('Sam');
  const circle = await makeCircle('Study group', me, [friend.id]);

  made.users.push(friend.id);
  made.circles.push(circle);
  await page.goto(`/circles/${circle}`);
  await sharingDialog(page);

  await expect(page.getByRole('switch', { name: /Let us see each other's off days/ })).toHaveCount(0);
  await expect(page.getByText('Week together')).toHaveCount(0);
});

test('either partner can end the partnership, and it goes for both', async ({ page, browser, baseURL }) => {
  const me = await ensureE2EUser();
  const sam = await session(browser, baseURL, 'Sam');
  const pair = await makePair(me, sam.id);

  made.circles.push(pair);
  await sam.page.goto(`/circles/${pair}`);
  await sam.page.getByRole('button', { name: 'Circle settings' }).click();
  await sam.page.getByRole('button', { name: 'End partnership' }).click();
  await sam.page.getByRole('dialog').getByRole('button', { name: 'End partnership' }).click();
  await expect(sam.page).toHaveURL(/\/circles$/, { timeout: 20_000 });

  await page.goto(`/circles/${pair}`);
  await expect(page.getByRole('heading', { name: 'Circle not found' })).toBeVisible({ timeout: 20_000 });
});

test('a phone-width pair has no sideways scroll', async ({ page, browser, baseURL }) => {
  const me = await ensureE2EUser();
  const sam = await session(browser, baseURL, 'SamWithAVeryLongNameThatHasToWrapOnAPhone');
  const pair = await makePair(me, sam.id);

  made.circles.push(pair);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`/circles/${pair}`);
  await expect(page.getByText('Week together')).toBeVisible({ timeout: 20_000 });

  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(0);
});
