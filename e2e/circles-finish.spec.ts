import { expect, test } from '@playwright/test';
import { cleanUp, makeCircle, makeFriend, seedHabitFor, shareHabit } from '@e2e/support/circles';
import { daysAgo, ensureE2EUser, resetUserData, seedHabit } from '@e2e/support/data';

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

test('Circles is in the main navigation and opens the circles page', async ({ page }) => {
  await page.goto('/today');
  await page.getByRole('link', { name: 'Circles' }).click();

  await expect(page).toHaveURL(/\/circles$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Circles' })).toBeVisible();
});

test('Home offers to start a circle, and lists the circles once there are some', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await page.goto('/');

  const card = page.getByRole('region', { name: 'Circles' });

  await expect(card.getByText(/Share your progress with a few close friends/)).toBeVisible({ timeout: 20_000 });
  await expect(card.getByRole('link', { name: 'Start a circle' })).toBeVisible();

  const me = await ensureE2EUser();
  const sam = await makeFriend('sam');
  const circle = await makeCircle('Study group', me, [sam]);

  made.users.push(sam);
  made.circles.push(circle);

  await page.reload();
  await expect(card.getByRole('link', { name: /Study group/ })).toContainText('2 people');
  await card.getByRole('link', { name: /Study group/ }).click();
  await expect(page).toHaveURL(new RegExp(`/circles/${circle}$`));
});

test('the circle page says how many habits the circle ticked this week, as one number, counting only what is shared', async ({
  page,
}) => {
  const me = await ensureE2EUser();
  const sam = await makeFriend('sam');
  const circle = await makeCircle('Study group', me, [sam]);

  made.users.push(sam);
  made.circles.push(circle);

  await page.goto(`/circles/${circle}`);
  await expect(page.getByText(/A fresh week/)).toBeVisible({ timeout: 20_000 });

  const walk = await seedHabitFor({ userId: sam, name: 'Walk', startDate: daysAgo(10), ticks: [daysAgo(0)] });

  await shareHabit({ habitId: walk, circleId: circle, level: 'done_today' });
  await page.reload();
  await expect(page.getByText('This week the circle has ticked 1 habit.')).toBeVisible();
});
