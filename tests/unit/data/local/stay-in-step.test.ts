import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChanges } from '@/data/local/changes';
import { createFocusChanges } from '@/data/local/focus-changes';
import { migrate } from '@/data/local/migrations';
import { createProfileChanges } from '@/data/local/profile-changes';
import { createReads } from '@/data/local/reads';
import {
  createStayInStep,
  Rejected,
  type HabitPayload,
  type RemoteFocus,
  type RemoteHabit,
  type StepPort,
} from '@/data/local/stay-in-step';
import { createSync, type AccountSettings } from '@/data/local/sync';
import { memorySql } from '@tests/unit/data/local/memory-sql';

const NOW = new Date('2026-10-24T12:00:00Z');

const MORE = (minutes: number) => {
  return new Date(NOW.getTime() + minutes * 60_000);
};

const SETTINGS: AccountSettings = {
  display_name: 'Account Name',
  tag: 'acct',
  timezone: 'UTC',
  week_starts_on: 1,
  sound_id: 'bell',
  sound_volume: 0.6,
  accent: null,
  accent_custom: null,
  password_set: false,
  avatar_kind: 'google',
  avatar_value: null,
  avatar_color: null,
  avatar_url: 'https://lh3.example/photo.jpg',
};

/** An account in memory that obeys the same rules as the database functions: the newest edit wins, ticks need a habit. */
const server = () => {
  const state = {
    habits: new Map<string, RemoteHabit>(),
    ticks: new Set<string>(),
    focus: new Map<string, RemoteFocus>(),
    settings: { ...SETTINGS },
    down: false,
    calls: [] as string[],
    savedKeys: [] as string[],
  };

  const guard = (call: string) => {
    state.calls.push(call);

    if (state.down) {
      throw new TypeError('Failed to fetch');
    }
  };

  const port: StepPort = {
    putHabit: (habit: HabitPayload) => {
      guard('putHabit');

      const { id, updatedAt, ...rest } = habit;
      const current = state.habits.get(id);

      if (!current || new Date(current.updated_at) <= new Date(updatedAt)) {
        state.habits.set(id, {
          id,
          updated_at: new Date().toISOString(),
          name: rest.name,
          description: rest.description,
          icon: rest.icon,
          color: rest.color,
          start_date: rest.startDate,
          links: rest.links,
          created_at: rest.createdAt,
          archived_at: rest.archivedAt,
          schedules: rest.schedules.map(({ kind, timesPerWeek, weekdays, effectiveFrom }) => {
            return { kind, times_per_week: timesPerWeek, weekdays, effective_from: effectiveFrom };
          }),
          pauses: rest.pauses.map(({ archivedOn, restoredOn }) => {
            return { archived_on: archivedOn, restored_on: restoredOn };
          }),
        });
      }

      return Promise.resolve();
    },
    deleteHabit: id => {
      guard('deleteHabit');
      state.habits.delete(id);

      return Promise.resolve();
    },
    setTick: (habitId, date, done) => {
      guard('setTick');

      if (!state.habits.has(habitId)) {
        return Promise.reject(new Rejected('habit_not_found'));
      }

      state.ticks[done ? 'add' : 'delete'](`${habitId}|${date}`);

      return Promise.resolve();
    },
    putFocus: session => {
      guard('putFocus');
      state.focus.set(session.id, session);

      return Promise.resolve();
    },
    deleteFocus: id => {
      guard('deleteFocus');
      state.focus.delete(id);

      return Promise.resolve();
    },
    saveSettings: patch => {
      guard('saveSettings');
      state.savedKeys.push(...Object.keys(patch));
      state.settings = { ...state.settings, ...patch };

      return Promise.resolve();
    },
    readState: () => {
      guard('readState');

      return Promise.resolve({
        habits: [...state.habits.values()],
        ticks: [...state.ticks].map(key => {
          const [habit_id, completion_date] = key.split('|');

          return { habit_id, completion_date };
        }),
        focus: [...state.focus.values()],
        settings: state.settings,
      });
    },
  };

  return { state, port };
};

const habit = (name: string, over: Record<string, unknown> = {}) => {
  return { name, icon: '📖', color: 'moss', kind: 'daily', startDate: '2026-10-20', links: [], ...over };
};

/** A PC file linked to the account, with the engine ready. */
const linked = async () => {
  const sql = memorySql();

  await migrate(sql);
  await createSync(sql, {} as never).link('u1');

  const remote = server();

  return {
    sql,
    remote,
    changes: createChanges(sql),
    focus: createFocusChanges(sql),
    profile: createProfileChanges(sql),
    reads: createReads(sql),
    step: createStayInStep(sql, remote.port),
  };
};

const dirty = async (sql: Awaited<ReturnType<typeof linked>>['sql']) => {
  return sql.select<{ kind: string }>('select kind from dirty');
};

const names = async (sql: Awaited<ReturnType<typeof linked>>['sql']) => {
  return (await sql.select<{ name: string }>('select name from habits order by created_at, id')).map(({ name }) => {
    return name;
  });
};

describe('staying in step with the account', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps no record of changes while the file is not linked to an account', async () => {
    const sql = memorySql();

    await migrate(sql);
    await createChanges(sql).createHabit(habit('Read'));

    expect(await dirty(sql)).toEqual([]);

    const remote = server();

    expect(await createStayInStep(sql, remote.port).run('u1')).toEqual({ pushed: 0, pulled: false });
    expect(remote.state.calls).toEqual([]);
  });

  it('sends a habit, its ticks and a finished focus session with the ids the PC made', async () => {
    const { sql, remote, changes, focus, step } = await linked();

    await changes.createHabit(habit('Read', { kind: 'weekdays', weekdays: [1, 3] }));

    const [{ id }] = await sql.select<{ id: string }>('select id from habits');

    await changes.setCompletion(id, '2026-10-21', true);
    await focus.startFocus({ habitId: id, mode: 'free', plan: null, soundId: null });
    vi.setSystemTime(MORE(30));
    await focus.stopFocus();

    expect(await step.run('u1')).toMatchObject({ pushed: expect.any(Number) });
    expect(remote.state.habits.get(id)).toMatchObject({
      name: 'Read',
      schedules: [{ kind: 'weekdays', weekdays: [1, 3], effective_from: '2026-10-20' }],
    });
    expect([...remote.state.ticks]).toEqual([`${id}|2026-10-21`]);
    expect([...remote.state.focus.values()]).toMatchObject([{ habit_id: id, focus_seconds: 1800 }]);
    expect(await dirty(sql)).toEqual([]);
  });

  it('sends edits, an archive, an untick and a delete', async () => {
    const { sql, remote, changes, step } = await linked();

    await changes.createHabit(habit('Read'));
    await changes.createHabit(habit('Run'));

    const [{ id }, { id: runId }] = await sql.select<{ id: string }>('select id from habits order by created_at, id');

    await changes.setCompletion(id, '2026-10-21', true);
    await step.run('u1');
    vi.setSystemTime(MORE(5));
    await changes.updateHabit(id, habit('Read more'));
    await changes.setCompletion(id, '2026-10-21', false);
    await changes.archiveHabit(runId);
    await step.run('u1');

    expect(remote.state.habits.get(id)?.name).toBe('Read more');
    expect(remote.state.habits.get(runId)).toMatchObject({ archived_at: expect.any(String) });
    expect(remote.state.habits.get(runId)?.pauses).toEqual([{ archived_on: '2026-10-24', restored_on: null }]);
    expect(remote.state.ticks.size).toBe(0);

    await changes.deleteHabit(runId);
    await step.run('u1');

    expect([...remote.state.habits.keys()]).toEqual([id]);
  });

  it('brings in what was done elsewhere: a habit with its ticks and sessions, under the same ids', async () => {
    const { sql, remote, reads, step } = await linked();
    const id = '10000000-0000-4000-8000-0000000000a1';

    remote.state.habits.set(id, {
      id,
      name: 'From the web',
      description: null,
      icon: '🏃',
      color: 'clay',
      start_date: '2026-10-20',
      links: ['https://a.example'],
      created_at: '2026-10-20T08:00:00+00:00',
      updated_at: '2026-10-20T08:00:00+00:00',
      archived_at: null,
      schedules: [{ kind: 'weekly_count', times_per_week: 3, weekdays: null, effective_from: '2026-10-20' }],
      pauses: [],
    });
    remote.state.ticks.add(`${id}|2026-10-21`);
    remote.state.focus.set('20000000-0000-4000-8000-0000000000a1', {
      id: '20000000-0000-4000-8000-0000000000a1',
      habit_id: id,
      started_at: '2026-10-21T07:00:00+00:00',
      ended_at: '2026-10-21T07:25:00+00:00',
      mode: 'free',
      plan: null,
      skipped_seconds: 0,
      paused_seconds: 0,
      focus_seconds: 1500,
      sound_id: null,
    });

    expect(await step.run('u1')).toMatchObject({ pulled: true });
    expect(await names(sql)).toEqual(['From the web']);
    expect((await reads.habits()).active[0]).toMatchObject({ id, links: ['https://a.example'] });
    expect(await sql.select('select completion_date from habit_completions')).toEqual([
      { completion_date: '2026-10-21' },
    ]);
    expect(await sql.select('select id, focus_seconds from focus_sessions')).toEqual([
      { id: '20000000-0000-4000-8000-0000000000a1', focus_seconds: 1500 },
    ]);
    expect(await dirty(sql)).toEqual([]);
    expect(await step.run('u1')).toMatchObject({ pushed: 0 });
  });

  it('removes what was deleted or unticked elsewhere, and takes the account newer edit', async () => {
    const { sql, remote, changes, step } = await linked();

    await changes.createHabit(habit('Read'));
    await changes.createHabit(habit('Gone'));

    const [{ id }, { id: goneId }] = await sql.select<{ id: string }>('select id from habits order by created_at, id');

    await changes.setCompletion(id, '2026-10-21', true);
    await step.run('u1');

    vi.setSystemTime(MORE(10));
    remote.state.habits.delete(goneId);
    remote.state.ticks.delete(`${id}|2026-10-21`);
    remote.state.habits.set(id, {
      ...(remote.state.habits.get(id) as RemoteHabit),
      name: 'Renamed on the web',
      updated_at: MORE(10).toISOString(),
    });

    await step.run('u1');

    expect(await names(sql)).toEqual(['Renamed on the web']);
    expect(await sql.select('select id from habit_completions')).toEqual([]);
  });

  it('keeps a newer edit made on the PC when the account has an older one, and sends it', async () => {
    const { sql, remote, changes, step } = await linked();

    await changes.createHabit(habit('Read'));

    const [{ id }] = await sql.select<{ id: string }>('select id from habits');

    await step.run('u1');
    vi.setSystemTime(MORE(20));
    await changes.updateHabit(id, habit('Edited on the PC'));
    await step.run('u1');

    expect(remote.state.habits.get(id)?.name).toBe('Edited on the PC');
    expect(await names(sql)).toEqual(['Edited on the PC']);
  });

  it('changes nothing when there is no connection, keeps the changes to send, and catches up later', async () => {
    const { sql, remote, changes, step } = await linked();

    await changes.createHabit(habit('Made offline'));
    remote.state.down = true;

    await expect(step.run('u1')).rejects.toThrow('Failed to fetch');
    expect(await names(sql)).toEqual(['Made offline']);
    expect(await dirty(sql)).not.toEqual([]);

    remote.state.down = false;
    await step.run('u1');

    expect(
      [...remote.state.habits.values()].map(({ name }) => {
        return name;
      }),
    ).toEqual(['Made offline']);
    expect(await dirty(sql)).toEqual([]);
  });

  it('drops a change the account refuses for good, instead of retrying it forever', async () => {
    const { sql, remote, changes, step } = await linked();

    await changes.createHabit(habit('Read'));

    const [{ id }] = await sql.select<{ id: string }>('select id from habits');

    await step.run('u1');
    await changes.setCompletion(id, '2026-10-21', true);
    remote.state.habits.delete(id); // deleted on the web before the tick was sent

    await step.run('u1');

    expect(await dirty(sql)).toEqual([]);
  });

  it('sends the settings changed on the PC, and takes the ones changed elsewhere', async () => {
    const { sql, remote, profile, step } = await linked();

    await profile.updateWeekStart({ weekStartsOn: 7 });
    await step.run('u1');

    expect(remote.state.settings).toMatchObject({ week_starts_on: 7 });

    remote.state.settings = { ...remote.state.settings, timezone: 'Asia/Kolkata', accent: 'clay' };
    await step.run('u1');

    expect(await sql.select('select timezone, accent, week_starts_on from profile')).toEqual([
      { timezone: 'Asia/Kolkata', accent: 'clay', week_starts_on: 7 },
    ]);
    expect(await dirty(sql)).toEqual([]);
  });

  it('never writes to an account other than the one the file is linked to', async () => {
    const { remote, changes, step } = await linked();

    await changes.createHabit(habit('Read'));

    expect(await step.run('someone-else')).toEqual({ pushed: 0, pulled: false });
    expect(remote.state.calls).toEqual([]);
  });

  it('takes the avatar and the password flag changed elsewhere, without sending them back', async () => {
    const { sql, remote, step } = await linked();

    remote.state.settings = {
      ...remote.state.settings,
      password_set: true,
      avatar_kind: 'character',
      avatar_value: 'ghost',
      avatar_color: '#112233',
    };
    await step.run('u1');

    expect(await sql.select('select avatar_kind, avatar_value, avatar_color, password_set from profile')).toEqual([
      { avatar_kind: 'character', avatar_value: 'ghost', avatar_color: '#112233', password_set: 1 },
    ]);
    expect(await dirty(sql)).toEqual([]);
    expect(await step.run('u1')).toMatchObject({ pushed: 0, pulled: false });
  });

  it('sends an avatar chosen on the PC, but never the password flag or the Google picture address', async () => {
    const { remote, profile, step } = await linked();

    await profile.updateAvatar({ kind: 'emoji', value: '🔥', color: '#ff8800' });
    await step.run('u1');

    expect(remote.state.settings).toMatchObject({ avatar_kind: 'emoji', avatar_value: '🔥', avatar_color: '#ff8800' });
    expect(remote.state.settings).toMatchObject({ password_set: false, avatar_url: 'https://lh3.example/photo.jpg' });
    expect(remote.state.savedKeys).not.toContain('password_set');
    expect(remote.state.savedKeys).not.toContain('avatar_url');
  });

  it('does not run twice at once', async () => {
    const { remote, changes, step } = await linked();

    await changes.createHabit(habit('Read'));

    const [first, second] = await Promise.all([step.run('u1'), step.run('u1')]);

    expect([first, second].filter(Boolean)).toHaveLength(2);
    expect(
      remote.state.calls.filter(call => {
        return call === 'readState';
      }),
    ).toHaveLength(1);
  });
});
