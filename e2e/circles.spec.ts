import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { cleanUp, cleanUpByName, makeLoginFriend } from '@e2e/support/circles';
import { signInState } from '@e2e/support/session';

const PREFIX = 'E2E ';
const NAME = `${PREFIX}Study group`;

const made: { circles: string[]; users: string[] } = { circles: [], users: [] };
const extraContexts: BrowserContext[] = [];

test.afterEach(async () => {
  for (const context of extraContexts.splice(0)) {
    await context.close();
  }

  await cleanUpByName(PREFIX);
  await cleanUp(made);
  made.circles = [];
  made.users = [];
});

/** Starts a circle by clicking through the screens, and returns once its page is open. */
const startCircle = async (page: Page, name = NAME) => {
  await page.goto('/circles');
  await page.getByRole('button', { name: 'New circle' }).click();
  await page.getByLabel('Circle name').fill(name);
  await page.getByRole('button', { name: 'Create circle' }).click();
  await expect(page).toHaveURL(/\/circles\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
};

/** A friend, signed in in their own browser session, with their own page. */
const friendSession = async (browser: Browser, baseURL: string | undefined) => {
  const friend = await makeLoginFriend('Sam');
  const storageState = await signInState(friend.email, friend.password);
  const context = await browser.newContext({ baseURL, storageState, reducedMotion: 'reduce' });

  made.users.push(friend.id);
  extraContexts.push(context);

  return context.newPage();
};

/** Opens the invite dialog on the circle's page and returns the link it shows. */
const inviteLink = async (page: Page) => {
  await page.getByRole('button', { name: 'Invite' }).click();
  const field = page.getByLabel('Invite link');

  await expect(field).toHaveValue(/\/circles\/join\/[0-9a-f]{64}$/);

  return field.inputValue();
};

test('with no circles, a person is invited to start one', async ({ page }) => {
  await page.goto('/circles');

  await expect(page.getByRole('heading', { level: 1, name: 'Circles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No circles yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start a circle' })).toBeVisible();
});

test('a circle needs a name before it can be made', async ({ page }) => {
  await page.goto('/circles');
  await page.getByRole('button', { name: 'New circle' }).click();

  const create = page.getByRole('button', { name: 'Create circle' });

  await expect(create).toBeDisabled();
  await page.getByLabel('Circle name').fill('   ');
  await expect(create).toBeDisabled();
  await page.getByLabel('Circle name').fill(NAME);
  await expect(create).toBeEnabled();
});

test('starting a circle opens it with you in it, and it appears in the list', async ({ page }) => {
  await startCircle(page);

  const members = page.getByRole('list').filter({ hasText: 'Started it' });

  await expect(members.getByText('You', { exact: true })).toBeVisible();
  await expect(members.getByText('Started it')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Invite' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Leave' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close circle' })).toBeVisible();

  await page.goto('/circles');

  const card = page.getByRole('link', { name: new RegExp(NAME) });

  await expect(card).toContainText('1 person');
  await expect(card).toContainText('You started it');
});

test('an invite brings a friend in, and they see who is there', async ({ page, browser, baseURL }) => {
  await startCircle(page);
  const link = await inviteLink(page);
  const friend = await friendSession(browser, baseURL);

  await friend.goto(link);
  await expect(friend.getByRole('heading', { name: `Join ${NAME}?` })).toBeVisible();
  await expect(friend.getByText('1 person is in this circle.')).toBeVisible();
  await expect(friend.getByRole('list', { name: 'Who is in it' })).toContainText('E2E User');

  await friend.getByRole('button', { name: 'Join circle' }).click();
  await expect(friend).toHaveURL(/\/circles\/[0-9a-f-]{36}$/);
  await expect(friend.getByRole('heading', { level: 1, name: NAME, exact: true })).toBeVisible();
  await expect(friend.getByRole('listitem').filter({ hasText: 'Sam' })).toContainText('You');
  await expect(friend.getByRole('listitem').filter({ hasText: 'E2E User' })).toContainText('Started it');

  // A member is not the owner: no way to invite, close the circle or remove anyone.
  await expect(friend.getByRole('button', { name: 'Invite' })).toHaveCount(0);
  await expect(friend.getByRole('button', { name: 'Close circle' })).toHaveCount(0);
  await expect(friend.getByRole('button', { name: /^Remove/ })).toHaveCount(0);
  await expect(friend.getByRole('button', { name: 'Leave' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('listitem').filter({ hasText: 'Sam' })).toBeVisible();
  await page.goto('/circles');
  await expect(page.getByRole('link', { name: new RegExp(NAME) })).toContainText('2 people');
});

test('the owner can remove a friend, who then no longer finds the circle', async ({ page, browser, baseURL }) => {
  await startCircle(page);
  const friend = await friendSession(browser, baseURL);

  await friend.goto(await inviteLink(page));
  await friend.getByRole('button', { name: 'Join circle' }).click();
  await expect(friend).toHaveURL(/\/circles\/[0-9a-f-]{36}$/);
  await expect(friend.getByRole('heading', { level: 1, name: NAME, exact: true })).toBeVisible();
  const circleUrl = friend.url();

  await page.getByRole('button', { name: 'Close', exact: true }).click(); // the invite dialog
  await page.reload();
  await page.getByRole('button', { name: 'Remove Sam from the circle' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Sam' })).toHaveCount(0);

  await friend.goto(circleUrl);
  await expect(friend.getByRole('heading', { name: 'Circle not found' })).toBeVisible();
  await friend.goto('/circles');
  await expect(friend.getByRole('heading', { name: 'No circles yet' })).toBeVisible();
});

test('a friend can leave, and the owner can close the circle', async ({ page, browser, baseURL }) => {
  await startCircle(page);
  const friend = await friendSession(browser, baseURL);

  await friend.goto(await inviteLink(page));
  await friend.getByRole('button', { name: 'Join circle' }).click();
  await expect(friend.getByRole('heading', { level: 1, name: NAME, exact: true })).toBeVisible();

  await friend.getByRole('button', { name: 'Leave' }).click();
  await friend.getByRole('button', { name: 'Leave circle' }).click();
  await expect(friend).toHaveURL(/\/circles$/);
  await expect(friend.getByRole('heading', { name: 'No circles yet' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('listitem').filter({ hasText: 'Sam' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Close circle' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close circle' }).click();
  await expect(page).toHaveURL(/\/circles$/);
  await expect(page.getByRole('heading', { name: 'No circles yet' })).toBeVisible();
});

test('an invite that is made up, or was replaced by a newer one, does not work', async ({ page, browser, baseURL }) => {
  await startCircle(page);
  const oldLink = await inviteLink(page);
  const friend = await friendSession(browser, baseURL);

  await friend.goto(`/circles/join/${'0'.repeat(64)}`);
  await expect(friend.getByRole('heading', { name: 'This invite does not work' })).toBeVisible();

  await page.getByRole('button', { name: 'Make a new link' }).click();
  await expect(page.getByLabel('Invite link')).not.toHaveValue(oldLink);

  await friend.goto(oldLink);
  await expect(friend.getByRole('heading', { name: 'This invite does not work' })).toBeVisible();
});

test('a phone-width screen has no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await startCircle(page, `${PREFIX}A circle with a rather long name that has to wrap`);

  const overflow = () => {
    return page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
  };

  expect(await overflow()).toBeLessThanOrEqual(0);
  await page.goto('/circles');
  await expect(page.getByRole('link', { name: /A circle with a rather long name/ })).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
});
