import { expect, test } from '@playwright/test';
import { cleanUp, makeCircle, makeFriend, seedHabitFor, shareHabit } from '@e2e/support/circles';
import { adminClient, daysAgo, ensureE2EUser, resetUserData, seedCompletion, seedHabit } from '@e2e/support/data';

const made: { circles: string[]; users: string[] } = { circles: [], users: [] };

test.beforeEach(async () => {
  await resetUserData();
});

test.afterEach(async () => {
  await cleanUp(made);
  made.circles = [];
  made.users = [];
  await resetUserData();
});

test('Home names the friends who showed up today, only once they have, and never names who did not', async ({
  page,
}) => {
  const me = await ensureE2EUser();
  const sam = await makeFriend('Sam');
  const kim = await makeFriend('Kim');
  const circle = await makeCircle('Study group', me, [sam, kim]);

  made.users.push(sam, kim);
  made.circles.push(circle);
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  const walk = await seedHabitFor({ userId: sam, name: 'Walk', startDate: daysAgo(5) });
  const run = await seedHabitFor({ userId: kim, name: 'Run', startDate: daysAgo(5) });

  await shareHabit({ habitId: walk, circleId: circle, level: 'showed_up' });
  await shareHabit({ habitId: run, circleId: circle, level: 'done_today' });

  const card = page.getByRole('region', { name: 'Circles' });

  // Nobody has ticked yet: the card lists the circle and says nothing about today.
  await page.goto('/');
  await expect(card.getByRole('link', { name: /Study group/ })).toBeVisible({ timeout: 20_000 });
  await expect(card.getByText(/showed up today/)).toHaveCount(0);

  // Sam ticks. Only Sam is named, and not Kim, who has not.
  await seedCompletion(walk, daysAgo(0));
  await page.reload();
  await expect(card.getByText('Sam showed up today.')).toBeVisible({ timeout: 20_000 });
  await expect(card).not.toContainText('Kim');

  // Both do.
  await seedCompletion(run, daysAgo(0));
  await page.reload();
  await expect(card.getByText('Kim and Sam showed up today.')).toBeVisible({ timeout: 20_000 });

  // Sam pauses sharing: Sam is not named.
  await adminClient().from('profiles').update({ circles_paused: true }).eq('user_id', sam);
  await page.reload();
  await expect(card.getByText('Kim showed up today.')).toBeVisible({ timeout: 20_000 });
});

test('the endpoint is closed to people who are not signed in', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });

  try {
    expect((await context.request.get('/api/circles/today')).status()).toBe(401);
  } finally {
    await context.close();
  }
});
