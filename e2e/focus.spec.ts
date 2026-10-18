import { expect, test, type Page } from '@playwright/test';
import {
  daysAgo,
  getCompletions,
  getFocusSessions,
  getProfileRow,
  resetProfile,
  resetUserData,
  seedCompletion,
  seedCustomSound,
  seedFocusSession,
  seedHabit,
  setProfileSound,
} from '@e2e/support/data';

test.beforeEach(async () => {
  await resetUserData();
});
test.afterEach(async () => {
  await resetProfile(); // a test may have changed the account's sound
});

const bar = (page: Page) => {
  return page.getByRole('region', { name: 'Focus session' });
};

const startPill = (page: Page, name: string) => {
  return page.getByRole('button', { name: `Start a focus session on ${name}` });
};

/** The calendar day (UTC, the e2e user's timezone) a session that started `minutes` ago belongs to. */
const dayStartedMinutesAgo = (minutes: number): string => {
  return new Date(Date.now() - minutes * 60_000).toISOString().slice(0, 10);
};

test('a Free session stopped under a minute leaves no record and asks nothing', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await page.goto('/today');
  await startPill(page, 'Read').click();
  await page.getByRole('radio', { name: 'Free' }).click();
  await page.getByRole('button', { name: 'Start' }).click();

  const dialog = page.getByRole('dialog');

  await expect(dialog.getByRole('timer')).toBeVisible();
  await dialog.getByRole('button', { name: 'Stop' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('Under a minute, so nothing was saved.')).toBeVisible();
  await expect(bar(page)).toBeHidden();
  expect(await getFocusSessions(id)).toEqual([]);
});

test('stopping a session asks "I did it", and yes ticks the habit for the day it started', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: id, startedMinutesAgo: 10 });
  await page.goto('/today');
  await bar(page).getByRole('button', { name: 'Stop' }).click();

  const dialog = page.getByRole('dialog', { name: 'Session finished' });

  await expect(dialog.getByText('You focused for 10 minutes.')).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: /I did it/ })).toBeChecked(); // ticked by default
  await dialog.getByRole('button', { name: 'Done' }).click();

  await expect(dialog).toBeHidden();
  await expect
    .poll(async () => {
      return (await getCompletions(id)).map(c => {
        return c.completion_date;
      });
    })
    .toEqual([dayStartedMinutesAgo(10)]);
  expect(await getFocusSessions(id)).toHaveLength(1);
});

test('unticking "I did it" keeps the focus minutes and ticks nothing', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: id, startedMinutesAgo: 5 });
  await page.goto('/habits');
  await bar(page).getByRole('button', { name: 'Stop' }).click();
  await page.getByRole('checkbox', { name: /I did it/ }).uncheck();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(bar(page)).toBeHidden();
  expect(await getCompletions(id)).toEqual([]);
  expect((await getFocusSessions(id))[0].focus_seconds).toBeGreaterThanOrEqual(300);
});

test('"Count this time in focus" is ticked by default, and unticking it leaves the minutes out', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: id, startedMinutesAgo: 10 });
  await page.goto('/today');
  await bar(page).getByRole('button', { name: 'Stop' }).click();

  const dialog = page.getByRole('dialog', { name: 'Session finished' });

  await expect(dialog.getByRole('checkbox', { name: /Count this time in focus/ })).toBeChecked();
  await dialog.getByRole('checkbox', { name: /Count this time in focus/ }).uncheck();
  await dialog.getByRole('button', { name: 'Done' }).click();

  await expect(dialog).toBeHidden();
  await expect
    .poll(async () => {
      return await getFocusSessions(id);
    })
    .toEqual([]);
  // "I did it" is its own box: still ticked, so the habit is ticked.
  expect(await getCompletions(id)).toHaveLength(1);
});

test('unticking the focus box on an already ticked habit leaves the minutes out', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedCompletion(id, dayStartedMinutesAgo(10));
  await seedFocusSession({ habitId: id, startedMinutesAgo: 10 });
  await page.goto('/today');
  await bar(page).getByRole('button', { name: 'Stop' }).click();

  const dialog = page.getByRole('dialog', { name: 'Session finished' });

  await expect(dialog.getByText('Read is already ticked for that day.')).toBeVisible();
  await dialog.getByRole('checkbox', { name: /Count this time in focus/ }).uncheck();
  await dialog.getByRole('button', { name: 'Close' }).first().click();

  await expect
    .poll(async () => {
      return await getFocusSessions(id);
    })
    .toEqual([]);
});

test('closing the ending panel applies the ticked box, so the habit is ticked', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: id, startedMinutesAgo: 10 });
  await page.goto('/today');
  await bar(page).getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('dialog', { name: 'Session finished' })).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect
    .poll(async () => {
      return (await getCompletions(id)).length;
    })
    .toBe(1);
});

test('a habit that is already ticked has no "I did it" box, only the focus one', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedCompletion(id, dayStartedMinutesAgo(10));
  await seedFocusSession({ habitId: id, startedMinutesAgo: 10 });
  await page.goto('/today');
  await bar(page).getByRole('button', { name: 'Stop' }).click();

  const dialog = page.getByRole('dialog', { name: 'Session finished' });

  await expect(dialog.getByText('Read is already ticked for that day.')).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: /I did it/ })).toHaveCount(0);
  await expect(dialog.getByRole('checkbox')).toHaveCount(1); // "Count this time in focus"
  await dialog.getByRole('button', { name: 'Close' }).first().click();
  await expect(dialog).toBeHidden();
});

test('a Pomodoro runs through its phases: the bar shows the break, Skip break goes back to focus', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  // 26 minutes into Classic: the first focus round (25) is over and the break has 4 minutes left
  await seedFocusSession({ habitId: id, startedMinutesAgo: 26, mode: 'pomodoro' });
  await page.goto('/today');

  await expect(bar(page)).toContainText('Break, next: round 2');
  await bar(page).getByRole('button', { name: 'Open the focus session on Read' }).click();

  const dialog = page.getByRole('dialog');

  await expect(dialog.getByText('Break, next: round 2')).toBeVisible();
  await dialog.getByRole('button', { name: 'Skip break' }).click();
  await expect(dialog.getByText('Focus, round 2 of 4')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Skip break' })).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByText('You focused for 25 minutes.')).toBeVisible();
});

test('a plan that has run out ends by itself and asks "I did it"', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({
    habitId: id,
    startedMinutesAgo: 30,
    mode: 'pomodoro',
    plan: { focusMin: 5, breakMin: 1, longBreakMin: 1, rounds: 2 },
  });
  await page.goto('/today');

  await expect(page.getByRole('dialog', { name: 'Session finished' })).toBeVisible();
  await expect(page.getByText('You focused for 10 minutes.')).toBeVisible();
});

test('the bar follows you to other pages, and tapping it reopens the panel', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: id, startedMinutesAgo: 3 });
  await page.goto('/progress');
  await expect(bar(page)).toContainText('Read');
  await expect(page).toHaveTitle('Progress · Cadence'); // in the foreground the page keeps its own title

  await page.getByRole('link', { name: 'Habits' }).first().click();
  await expect(bar(page)).toBeVisible();
  await expect(page).toHaveTitle('Habits · Cadence');
  await bar(page).getByRole('button', { name: 'Open the focus session on Read' }).click();
  await expect(page.getByRole('dialog').getByRole('timer')).toBeVisible();

  // in the background the tab carries the time; coming back (or the session ending) gives the open page's title back
  const setHidden = async (hidden: boolean) => {
    await page.evaluate(value => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => {
          return value;
        },
      });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  };

  await page.keyboard.press('Escape');
  await setHidden(true);
  await expect(page).toHaveTitle(/^\d+:\d{2} · Read$/);
  await setHidden(false);
  await expect(page).toHaveTitle('Habits · Cadence');

  await setHidden(true);
  await expect(page).toHaveTitle(/ · Read$/);
  await setHidden(false);
  await page.getByRole('button', { name: 'Open the focus session on Read' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Stop' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page).toHaveTitle('Habits · Cadence');
});

test('starting a second session is refused and names the one that is running', async ({ page }) => {
  const read = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  const write = await seedHabit({ name: 'Write', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: read, startedMinutesAgo: 3 });
  await page.goto('/today');
  await startPill(page, 'Write').click();

  await expect(page.getByRole('dialog').getByText('Read already has a focus session running.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toHaveCount(0);
  expect(await getFocusSessions(write)).toEqual([]);
});

test('the setup remembers the last numbers used on the habit and the sound chosen for it', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({
    habitId: id,
    startedMinutesAgo: 120,
    mode: 'pomodoro',
    plan: { focusMin: 30, breakMin: 7, longBreakMin: 20, rounds: 3 },
    finishedWithSeconds: 1800,
    soundId: 'marimba',
  });
  await page.goto('/today');
  await startPill(page, 'Read').click();

  await expect(page.getByLabel('Focus (min)')).toHaveValue('30');
  await expect(page.getByLabel('Rounds')).toHaveValue('3');
  await expect(page.getByText(/About .*, 90 minutes of focus/)).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Marimba' })).toBeChecked();
  await expect(page.getByRole('radio', { name: /^Default/ })).not.toBeChecked();
});

test('the sound opens on the profile default and lists your own sounds too', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  await setProfileSound('wood');
  await seedCustomSound('Air horn');
  await page.goto('/today');
  await startPill(page, 'Read').click();

  await expect(page.getByRole('radio', { name: 'Default · Wood' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Air horn' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Marimba' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Change your default in your profile' })).toBeVisible();
});

test('a sound chosen for one session is kept on it and leaves the profile default alone', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  const clip = await seedCustomSound('Air horn');

  await page.goto('/today');
  await startPill(page, 'Read').click();
  await page.getByRole('radio', { name: 'Free' }).click();
  await page.getByRole('radio', { name: 'Air horn' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  await expect(page.getByRole('dialog').getByRole('timer')).toBeVisible();
  await expect
    .poll(async () => {
      return (await getFocusSessions(id)).map(session => {
        return session.sound_id;
      });
    })
    .toEqual([clip]);
  expect((await getProfileRow()).sound_id).toBe('bell');
});

test('presets fill the numbers and a bad number blocks Start', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await page.goto('/today');
  await startPill(page, 'Read').click();
  await expect(page.getByRole('radio', { name: 'Classic' })).toBeChecked();

  await page.getByRole('radio', { name: 'Deep' }).click();
  await expect(page.getByLabel('Focus (min)')).toHaveValue('50');

  await page.getByLabel('Focus (min)').fill('999');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
  await expect(page.getByText(/Check the numbers/)).toBeVisible();
});

test('the Focus pill is not offered when looking at another day', async ({ page }) => {
  await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await page.goto(`/today?date=${daysAgo(1)}`);
  await expect(page.getByRole('checkbox', { name: 'Mark Read done' })).toBeVisible();
  await expect(startPill(page, 'Read')).toHaveCount(0);
});

test('Progress shows the focus time per habit and in total', async ({ page }) => {
  const read = await seedHabit({ name: 'Read', startDate: daysAgo(5) });
  const write = await seedHabit({ name: 'Write', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: read, startedMinutesAgo: 60, finishedWithSeconds: 1800 });
  await seedFocusSession({ habitId: write, startedMinutesAgo: 120, finishedWithSeconds: 600 });
  await page.goto('/progress');

  const card = page.getByRole('region', { name: 'Focus time' });

  await expect(card.getByText('40 minutes in total')).toBeVisible();
  await expect(card.getByText('30 min')).toBeVisible();
  await expect(card.getByText('10 min')).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 700 } });

  test('the panel is a bottom sheet, the bar fits and nothing scrolls sideways', async ({ page }) => {
    const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

    await seedFocusSession({ habitId: id, startedMinutesAgo: 3 });
    await page.goto('/today');
    await expect(bar(page)).toBeVisible();
    await bar(page).getByRole('button', { name: 'Open the focus session on Read' }).click();

    const box = await page.getByRole('dialog').boundingBox();

    expect(box?.width).toBeLessThanOrEqual(375);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThanOrEqual(690);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth - window.innerWidth;
    });

    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test('Pause holds the clock and Resume lets it run again', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: id, startedMinutesAgo: 10 });
  await page.goto('/today');

  const time = bar(page).locator('.focus-bar__time');

  await bar(page).getByRole('button', { name: 'Pause' }).click();
  await expect(bar(page).getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect
    .poll(async () => {
      return (await getFocusSessions(id))[0].paused_at;
    })
    .not.toBeNull();

  const held = await time.textContent();

  await page.waitForTimeout(2500);
  await expect(time).toHaveText(held ?? '');

  await bar(page).getByRole('button', { name: 'Resume' }).click();
  await expect(bar(page).getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect
    .poll(async () => {
      return (await getFocusSessions(id))[0].paused_at;
    })
    .toBeNull();
  expect((await getFocusSessions(id))[0].paused_seconds).toBeGreaterThanOrEqual(2);
});

test('the panel says Paused, and a paused Pomodoro break cannot be skipped', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: id, startedMinutesAgo: 27, mode: 'pomodoro' });
  await page.goto('/today');
  await bar(page).getByRole('button', { name: 'Open the focus session on Read' }).click();

  const dialog = page.getByRole('dialog');

  await expect(dialog.getByRole('button', { name: 'Skip break' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Pause' }).click();
  await expect(dialog.getByText('Paused')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Skip break' })).toBeHidden();
  await dialog.getByRole('button', { name: 'Resume' }).click();
  await expect(dialog.getByRole('button', { name: 'Skip break' })).toBeVisible();
});

test('a session left paused for over 12 hours is closed with the time up to its pause', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: id, startedMinutesAgo: 14 * 60, pausedMinutesAgo: 13 * 60 });
  await page.goto('/today');

  // the close happens when the page asks for the running session, so wait for it in the database
  await expect
    .poll(async () => {
      return (await getFocusSessions(id))[0].ended_at;
    })
    .not.toBeNull();
  await expect(bar(page)).toBeHidden();

  const [session] = await getFocusSessions(id);

  expect(session.focus_seconds).toBe(3600);
});

/** Holds every server action (the Next-Action requests) for `ms`, then lets it through, or fails it when `fail` is set. */
const slowActions = async (page: Page, ms: number, fail = false) => {
  await page.route('**/*', async route => {
    if (!route.request().headers()['next-action']) {
      await route.continue();

      return;
    }

    await new Promise(resolve => {
      return setTimeout(resolve, ms);
    });
    await (fail ? route.abort() : route.continue());
  });
};

test('Stop takes effect at once, before the server has answered', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: id, startedMinutesAgo: 10 });
  await page.goto('/today');
  await expect(bar(page)).toBeVisible();
  await slowActions(page, 3000);
  await bar(page).getByRole('button', { name: 'Stop' }).click();

  await expect(bar(page)).toBeHidden({ timeout: 1000 });
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Session finished')).toBeVisible();
});

test('a Stop that fails puts the session back, still running', async ({ page }) => {
  const id = await seedHabit({ name: 'Read', startDate: daysAgo(5) });

  await seedFocusSession({ habitId: id, startedMinutesAgo: 10 });
  await page.goto('/today');
  await expect(bar(page)).toBeVisible();
  await slowActions(page, 500, true);
  await bar(page).getByRole('button', { name: 'Stop' }).click();

  await expect(bar(page)).toBeVisible({ timeout: 10_000 });
  await expect(bar(page).getByRole('button', { name: 'Pause' })).toBeVisible();
  expect((await getFocusSessions(id))[0].ended_at).toBeNull();
});
