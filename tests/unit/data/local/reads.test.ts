import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrate } from '@/data/local/migrations';
import { createReads } from '@/data/local/reads';
import type { Sql } from '@/data/local/sql';
import type { HabitEntry } from '@/server/habit-data';
import { toListItem } from '@/server/habit-view';
import { buildHomeView } from '@/server/home-view';
import { toHomeData, toProgressData, toTodayData } from '@/server/page-data';
import { toProfileView } from '@/server/profile-view';
import { toHabitData } from '@/server/today-view';
import { memorySql } from '@tests/unit/data/local/memory-sql';

const NOW = new Date('2026-10-24T12:00:00Z'); // a Saturday, 2026-10-24 in UTC
const CTX = { today: '2026-10-24', weekStartsOn: 1 } as const;
const PROFILE = { timezone: 'UTC', weekStartsOn: 1, today: '2026-10-24', displayName: null } as const;
const AT = '2026-10-20T08:00:00.000Z';

const run = (sql: Sql, query: string, params: unknown[] = []) => {
  return sql.batch([{ query, params }]);
};

const habitRow = (id: string, over: Record<string, unknown> = {}) => {
  return {
    id,
    user_id: 'local',
    name: id === 'h1' ? 'Read' : 'Run',
    description: null,
    icon: '📖',
    color: 'moss',
    start_date: '2026-10-20',
    archived_at: null,
    links: [],
    created_at: AT,
    updated_at: AT,
    ...over,
  };
};

const addHabit = async (sql: Sql, id: string, over: Record<string, unknown> = {}) => {
  const h = habitRow(id, over);

  await run(
    sql,
    'insert into habits (id, name, description, icon, color, start_date, archived_at, links, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      h.id,
      h.name,
      h.description,
      h.icon,
      h.color,
      h.start_date,
      h.archived_at,
      JSON.stringify(h.links),
      h.created_at,
      h.updated_at,
    ],
  );

  return h;
};

const addSchedule = (
  sql: Sql,
  habit: string,
  kind: string,
  from: string,
  over: { weeks?: number; days?: number[] } = {},
) => {
  return run(
    sql,
    'insert into habit_schedules (id, habit_id, kind, times_per_week, weekdays, effective_from) values (?, ?, ?, ?, ?, ?)',
    [`${habit}-${from}`, habit, kind, over.weeks ?? null, over.days ? JSON.stringify(over.days) : null, from],
  );
};

const tick = (sql: Sql, habit: string, date: string) => {
  return run(sql, 'insert into habit_completions (id, habit_id, completion_date, created_at) values (?, ?, ?, ?)', [
    `${habit}-${date}`,
    habit,
    date,
    AT,
  ]);
};

let sql: Sql;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  sql = memorySql();
  await migrate(sql);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the local reads, with nothing in the file', () => {
  it('answers every page the way a new account does', async () => {
    const reads = createReads(sql);

    expect(await reads.today(undefined)).toEqual({
      view: { todo: [], done: [], optional: [], strip: [], hasHabits: false },
      date: '2026-10-24',
      today: '2026-10-24',
      earliest: '2026-10-24',
    });
    expect(await reads.home()).toEqual({
      ...buildHomeView([], CTX),
      today: '2026-10-24',
      name: null,
      timezone: 'UTC',
      weekStartsOn: 1,
    });
    expect(await reads.habits()).toEqual({ active: [], archived: [], profile: PROFILE });
    expect(await reads.progress(null, 30)).toEqual({ view: null, habits: [], focus: { totalSeconds: 0, byHabit: [] } });
    expect(await reads.account()).toEqual({ habits: 0, ticks: 0, focusSessions: 0 });
    expect(await reads.focus()).toEqual({ running: null, serverNow: NOW.toISOString(), plans: {}, sounds: {} });
  });

  it('shows a profile with the defaults: the Google picture, the Bell at 60%, no password', async () => {
    const view = await createReads(sql).profile();

    expect(view).toEqual(
      toProfileView({
        row: {
          display_name: null,
          tag: 'me',
          avatar_url: null,
          avatar_kind: 'google',
          avatar_value: null,
          avatar_color: null,
          timezone: 'UTC',
          week_starts_on: 1,
          sound_id: 'bell',
          sound_volume: 0.6,
          accent: null,
          accent_custom: null,
          password_set: false,
        },
        email: '',
        sounds: [],
        urls: {},
      }),
    );
    expect(view.passwordSet).toBe(false);
  });
});

describe('the local reads, with habits', () => {
  const entriesOf = async (): Promise<HabitEntry[]> => {
    const read = habitRow('h1');
    const run2 = habitRow('h2', { name: 'Run', icon: '🏃', color: 'clay', start_date: '2026-10-01' });
    const reads = {
      read: {
        habit: read,
        data: toHabitData(
          read as never,
          [{ kind: 'daily', times_per_week: null, weekdays: null, effective_from: '2026-10-20' }] as never,
          [],
          ['2026-10-22', '2026-10-23', '2026-10-24'],
        ),
      },
      run: {
        habit: run2,
        data: toHabitData(
          run2 as never,
          [{ kind: 'weekdays', times_per_week: null, weekdays: [1, 3, 5], effective_from: '2026-10-01' }] as never,
          [],
          ['2026-10-21'],
        ),
      },
    };

    return [reads.read, reads.run] as unknown as HabitEntry[];
  };

  beforeEach(async () => {
    await addHabit(sql, 'h1');
    await addSchedule(sql, 'h1', 'daily', '2026-10-20');
    await addHabit(sql, 'h2', { name: 'Run', icon: '🏃', color: 'clay', start_date: '2026-10-01' });
    await addSchedule(sql, 'h2', 'weekdays', '2026-10-01', { days: [1, 3, 5] });

    for (const date of ['2026-10-22', '2026-10-23', '2026-10-24']) {
      await tick(sql, 'h1', date);
    }

    await tick(sql, 'h2', '2026-10-21');
  });

  it('builds Today and Home from the rows with the same builders the server uses', async () => {
    const reads = createReads(sql);
    const loaded = { entries: await entriesOf(), ctx: CTX, profile: PROFILE };

    expect(await reads.today(undefined)).toEqual(toTodayData(loaded, undefined));
    expect(await reads.today('2026-10-23')).toEqual(toTodayData(loaded, '2026-10-23'));
    expect(await reads.home()).toEqual(toHomeData(loaded));
  });

  it('builds Progress for a filter and a window, with the focus time of finished sessions', async () => {
    await run(
      sql,
      "insert into focus_sessions (id, habit_id, started_at, ended_at, mode, focus_seconds) values ('s1', 'h1', '2026-10-23T09:00:00.000Z', '2026-10-23T09:30:00.000Z', 'free', 1800)",
    );

    const reads = createReads(sql);
    const loaded = { entries: await entriesOf(), ctx: CTX, profile: PROFILE };
    const focus = { totalSeconds: 1800, byHabit: [{ habitId: 'h1', seconds: 1800 }] };

    expect(await reads.progress(null, 30)).toEqual(
      await toProgressData(loaded, undefined, '30', () => {
        return Promise.resolve(focus);
      }),
    );
    expect(await reads.progress('h1', 7)).toEqual(
      await toProgressData(loaded, 'h1', '7', () => {
        return Promise.resolve(focus);
      }),
    );
  });

  it('lists the habits for the Habits page, active and archived, with the links and whether they have ticks', async () => {
    await run(sql, "update habits set links = ? where id = 'h1'", [JSON.stringify(['https://example.com/a'])]);
    await run(sql, "update habits set archived_at = ? where id = 'h2'", [AT]);
    await run(sql, "insert into habit_archive_periods (id, habit_id, archived_on) values ('p1', 'h2', '2026-10-22')");

    const view = await createReads(sql).habits();

    expect(view.profile).toEqual(PROFILE);
    expect(view.active).toEqual([
      toListItem(
        habitRow('h1', { links: ['https://example.com/a'] }) as never,
        [{ kind: 'daily', times_per_week: null, weekdays: null, effective_from: '2026-10-20' }] as never,
        true,
        '2026-10-24',
      ),
    ]);
    expect(
      view.archived.map(({ id, archivedAt }) => {
        return { id, archivedAt };
      }),
    ).toEqual([{ id: 'h2', archivedAt: AT }]);
  });

  it('counts what the account holds', async () => {
    await run(
      sql,
      "insert into focus_sessions (id, habit_id, started_at, mode) values ('s1', 'h1', '2026-10-24T11:00:00.000Z', 'free')",
    );

    expect(await createReads(sql).account()).toEqual({ habits: 2, ticks: 4, focusSessions: 1 });
  });
});

describe('the local reads, in the person’s own timezone and week', () => {
  it('works out today in the timezone of the profile, and reports its week start', async () => {
    await run(
      sql,
      "update profile set timezone = 'Asia/Kolkata', week_starts_on = 7, display_name = 'Mac' where id = 1",
    );
    vi.setSystemTime(new Date('2026-10-24T20:00:00Z')); // 01:30 on the 25th in Kolkata

    const view = await createReads(sql).habits();

    expect(view.profile).toEqual({
      timezone: 'Asia/Kolkata',
      weekStartsOn: 7,
      today: '2026-10-25',
      displayName: 'Mac',
    });
  });

  it('falls back to UTC for a timezone it does not know', async () => {
    await run(sql, "update profile set timezone = 'Mars/Olympus' where id = 1");

    expect((await createReads(sql).habits()).profile.timezone).toBe('UTC');
  });
});

describe('the local reads, focus', () => {
  it('reports the running session with its habit, and the numbers and sound last used on each habit', async () => {
    await addHabit(sql, 'h1');
    await addSchedule(sql, 'h1', 'daily', '2026-10-20');

    const plan = { focusMin: 30, breakMin: 7, longBreakMin: 20, rounds: 3 };

    await run(
      sql,
      "insert into focus_sessions (id, habit_id, started_at, ended_at, mode, plan, focus_seconds, sound_id) values ('s1', 'h1', '2026-10-23T09:00:00.000Z', '2026-10-23T09:30:00.000Z', 'pomodoro', ?, 1800, 'marimba')",
      [JSON.stringify(plan)],
    );
    await run(
      sql,
      "insert into focus_sessions (id, habit_id, started_at, mode, paused_at) values ('s2', 'h1', '2026-10-24T11:00:00.000Z', 'free', '2026-10-24T11:20:00.000Z')",
    );

    const state = await createReads(sql).focus();

    expect(state.running).toMatchObject({
      id: 's2',
      habitId: 'h1',
      habit: { name: 'Read', icon: '📖', color: 'moss' },
      mode: 'free',
      plan: null,
      startedAt: '2026-10-24T11:00:00.000Z',
      pausedAt: '2026-10-24T11:20:00.000Z',
      pausedSeconds: 0,
    });
    expect(state.plans).toEqual({ h1: plan });
    expect(state.serverNow).toBe(NOW.toISOString());
  });
});
