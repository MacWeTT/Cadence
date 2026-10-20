import { expect, test } from '@playwright/test';
import { cleanUp, makeCircle, makeFriend, seedHabitFor, shareHabit } from '@e2e/support/circles';
import { daysAgo, ensureE2EUser } from '@e2e/support/data';

const UNKNOWN_CIRCLE = '00000000-0000-4000-8000-00000000dead';

const made: { circles: string[]; users: string[] } = { circles: [], users: [] };

test.afterEach(async () => {
  await cleanUp(made);
  made.circles = [];
  made.users = [];
});

/** A friend who owns a circle that the e2e user has joined. */
const friendsCircle = async () => {
  const me = await ensureE2EUser();
  const friend = await makeFriend('sam');
  const circle = await makeCircle('Study group', friend, [me]);

  made.users.push(friend);
  made.circles.push(circle);

  return { me, friend, circle };
};

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the Circles endpoints are closed', async ({ request }) => {
    expect((await request.get('/api/circles')).status()).toBe(401);
    expect((await request.get(`/api/circles/${UNKNOWN_CIRCLE}`)).status()).toBe(401);
  });
});

test('with no circles, the list is empty', async ({ request }) => {
  const response = await request.get('/api/circles');

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
});

test('a circle that does not exist, or is not yours, is not found', async ({ request }) => {
  const stranger = await makeFriend('kim');
  const private_ = await makeCircle('Not yours', stranger, []);

  made.users.push(stranger);
  made.circles.push(private_);

  expect((await request.get('/api/circles/not-an-id')).status()).toBe(404);
  expect((await request.get(`/api/circles/${UNKNOWN_CIRCLE}`)).status()).toBe(404);
  expect((await request.get(`/api/circles/${private_}`)).status()).toBe(404);
});

test('the list shows the circles you are in', async ({ request }) => {
  const { circle } = await friendsCircle();
  const list = await (await request.get('/api/circles')).json();

  expect(list).toEqual([expect.objectContaining({ id: circle, name: 'Study group', isOwner: false })]);
});

test('a friend shows only what they chose to share, and nothing about what was missed', async ({ request }) => {
  const { me, friend, circle } = await friendsCircle();
  const today = daysAgo(0);
  const start = daysAgo(30);

  const read = await seedHabitFor({ userId: friend, name: 'Read', startDate: start, ticks: [today] });
  const walk = await seedHabitFor({ userId: friend, name: 'Walk', startDate: start, icon: '🚶' });
  const diary = await seedHabitFor({ userId: friend, name: 'Diary', startDate: start, ticks: [today] });
  // Never shared at all.
  const secret = await seedHabitFor({ userId: friend, name: 'Therapy', startDate: start, ticks: [today] });

  await shareHabit({ habitId: read, circleId: circle, level: 'done_today' });
  await shareHabit({ habitId: walk, circleId: circle, level: 'done_today', label: 'emoji' });
  await shareHabit({ habitId: diary, circleId: circle, level: 'showed_up' });

  const response = await request.get(`/api/circles/${circle}`);
  const body = await response.text();
  const view = JSON.parse(body);
  const sam = view.members.find((m: { isYou: boolean }) => {
    return !m.isYou;
  });
  const you = view.members.find((m: { isYou: boolean }) => {
    return m.isYou;
  });

  expect(response.status()).toBe(200);
  expect(view).toMatchObject({ id: circle, name: 'Study group', isOwner: false });
  expect(view.members).toHaveLength(2);
  expect(you.userId).toBe(me);
  expect(you.habits).toEqual([]);

  expect(sam.tag).toMatch(/^sam_/);
  expect(sam.showedUpWeek).toBe(true);
  expect(sam.habits).toEqual([
    expect.objectContaining({ name: 'Read', done: true, level: 'done_today', streak: null }),
    expect.objectContaining({ name: null, icon: '🚶', done: false }),
  ]);

  // Nothing about a habit that was not shared, the one shared as "showed up", the missed walk, or any habit id.
  for (const hidden of ['Therapy', 'Diary', read, walk, diary, secret]) {
    expect(body, String(hidden)).not.toContain(hidden);
  }

  expect(body.toLowerCase()).not.toContain('missed');
});

test('Streaks gives the streak and not the dates; Everything gives the dates too', async ({ request }) => {
  const { friend, circle } = await friendsCircle();
  const ticks = [daysAgo(2), daysAgo(1), daysAgo(0)];
  const start = daysAgo(30);
  const streaky = await seedHabitFor({ userId: friend, name: 'Stretch', startDate: start, ticks });
  const open = await seedHabitFor({ userId: friend, name: 'Run', startDate: start, ticks });

  await shareHabit({ habitId: streaky, circleId: circle, level: 'streaks' });
  await shareHabit({ habitId: open, circleId: circle, level: 'everything' });

  const view = await (await request.get(`/api/circles/${circle}`)).json();
  const sam = view.members.find((m: { isYou: boolean }) => {
    return !m.isYou;
  });

  const byName = (name: string) => {
    return sam.habits.find((h: { name: string }) => {
      return h.name === name;
    });
  };

  expect(byName('Stretch')).toMatchObject({ streak: { unit: 'day', count: 3 }, level: 'streaks' });
  expect(byName('Stretch')).not.toHaveProperty('ticks');
  expect(byName('Run')).toMatchObject({ streak: { unit: 'day', count: 3 }, ticks });
});
