import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChanges } from '@/data/local/changes';
import { migrate } from '@/data/local/migrations';
import { createReads } from '@/data/local/reads';
import { memorySql } from '@tests/unit/data/local/memory-sql';

const NOW = new Date('2026-10-24T12:00:00Z'); // a Saturday, 2026-10-24 in UTC

const input = (over: Record<string, unknown> = {}) => {
  return { name: 'Read', icon: '📖', color: 'moss', kind: 'daily', startDate: '2026-10-20', links: [], ...over };
};

const setup = async () => {
  const sql = memorySql();

  await migrate(sql);

  return { sql, changes: createChanges(sql), reads: createReads(sql) };
};

const only = async (sql: Awaited<ReturnType<typeof setup>>['sql']) => {
  const [{ id }] = await sql.select<{ id: string }>('select id from habits');

  return id;
};

describe('changes on local rows', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a habit with its first schedule, links and a trimmed description', async () => {
    const { sql, changes, reads } = await setup();

    expect(await changes.createHabit(input({ description: '  daily pages  ', links: ['https://a.example'] }))).toEqual({
      ok: true,
    });

    const { active } = await reads.habits();

    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ name: 'Read', description: 'daily pages', links: ['https://a.example'] });
    expect(await sql.select('select kind, effective_from from habit_schedules')).toEqual([
      { kind: 'daily', effective_from: '2026-10-20' },
    ]);
  });

  it('refuses a habit that fails the form rules, with its field errors', async () => {
    const { sql, changes } = await setup();
    const result = await changes.createHabit(input({ name: '', startDate: '2026-10-25' }));

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { name: expect.any(String), startDate: expect.any(String) },
    });
    expect(await sql.select('select id from habits')).toEqual([]);
  });

  it('keeps a weekdays schedule and a weekly count', async () => {
    const { sql, changes } = await setup();

    await changes.createHabit(input({ kind: 'weekdays', weekdays: [3, 1] }));
    await changes.createHabit(input({ name: 'Run', kind: 'weekly_count', timesPerWeek: 3 }));

    expect(await sql.select('select kind, times_per_week, weekdays from habit_schedules order by kind')).toEqual([
      { kind: 'weekdays', times_per_week: null, weekdays: '[1,3]' },
      { kind: 'weekly_count', times_per_week: 3, weekdays: null },
    ]);
  });

  it('edits a habit and replaces its only schedule when nothing was ticked', async () => {
    const { sql, changes } = await setup();

    await changes.createHabit(input());

    const id = await only(sql);

    expect(await changes.updateHabit(id, input({ name: 'Read more', kind: 'weekly_count', timesPerWeek: 2 }))).toEqual({
      ok: true,
    });
    expect(await sql.select('select name from habits')).toEqual([{ name: 'Read more' }]);
    expect(await sql.select('select kind, times_per_week from habit_schedules')).toEqual([
      { kind: 'weekly_count', times_per_week: 2 },
    ]);
  });

  it('starts a changed schedule on the next week once there are ticks, keeping the past one', async () => {
    const { sql, changes } = await setup();

    await changes.createHabit(input());

    const id = await only(sql);

    await changes.setCompletion(id, '2026-10-21', true);
    await changes.updateHabit(id, input({ kind: 'weekly_count', timesPerWeek: 2 }));

    expect(await sql.select('select kind, effective_from from habit_schedules order by effective_from')).toEqual([
      { kind: 'daily', effective_from: '2026-10-20' },
      { kind: 'weekly_count', effective_from: '2026-10-26' },
    ]);
  });

  it('refuses a start date after the first tick, and editing an archived or missing habit', async () => {
    const { changes, sql } = await setup();

    await changes.createHabit(input());

    const id = await only(sql);

    await changes.setCompletion(id, '2026-10-21', true);

    expect(await changes.updateHabit(id, input({ startDate: '2026-10-22' }))).toMatchObject({
      ok: false,
      fieldErrors: { startDate: expect.any(String) },
    });

    await changes.archiveHabit(id);

    expect(await changes.updateHabit(id, input())).toMatchObject({
      ok: false,
      error: expect.stringContaining('Restore'),
    });
    expect(await changes.updateHabit('missing', input())).toMatchObject({ ok: false });
  });

  it('archives into an open period and restores it, and refuses a second archive or restore', async () => {
    const { sql, changes, reads } = await setup();

    await changes.createHabit(input());

    const id = await only(sql);

    expect(await changes.archiveHabit(id)).toEqual({ ok: true });
    expect(await changes.archiveHabit(id)).toMatchObject({ ok: false });
    expect(await sql.select('select archived_on, restored_on from habit_archive_periods')).toEqual([
      { archived_on: '2026-10-24', restored_on: null },
    ]);
    expect((await reads.habits()).archived).toHaveLength(1);

    expect(await changes.restoreHabit(id)).toEqual({ ok: true });
    expect(await changes.restoreHabit(id)).toMatchObject({ ok: false });
    expect(await sql.select('select archived_on, restored_on from habit_archive_periods')).toEqual([
      { archived_on: '2026-10-24', restored_on: '2026-10-24' },
    ]);
    expect((await reads.habits()).active).toHaveLength(1);
  });

  it('deletes only an archived habit, with its rows', async () => {
    const { sql, changes } = await setup();

    await changes.createHabit(input());

    const id = await only(sql);

    await changes.setCompletion(id, '2026-10-21', true);

    expect(await changes.deleteHabit(id)).toMatchObject({ ok: false, error: expect.stringContaining('Archive') });

    await changes.archiveHabit(id);

    expect(await changes.deleteHabit(id)).toEqual({ ok: true });
    expect(await changes.deleteHabit(id)).toMatchObject({ ok: false });

    for (const table of ['habits', 'habit_schedules', 'habit_completions', 'habit_archive_periods']) {
      expect(await sql.select(`select * from ${table}`)).toEqual([]);
    }
  });

  it('ticks and unticks a day, and a tick twice is one row', async () => {
    const { sql, changes } = await setup();

    await changes.createHabit(input());

    const id = await only(sql);

    expect(await changes.setCompletion(id, '2026-10-21', true)).toEqual({ ok: true });
    expect(await changes.setCompletion(id, '2026-10-21', true)).toEqual({ ok: true });
    expect(await sql.select('select completion_date from habit_completions')).toEqual([
      { completion_date: '2026-10-21' },
    ]);

    expect(await changes.setCompletion(id, '2026-10-21', false)).toEqual({ ok: true });
    expect(await sql.select('select id from habit_completions')).toEqual([]);
  });

  it('refuses a tick on a missing or archived habit, in the future, before the start, or malformed', async () => {
    const { sql, changes } = await setup();

    await changes.createHabit(input());

    const id = await only(sql);

    expect(await changes.setCompletion('missing', '2026-10-21', true)).toMatchObject({ ok: false });
    expect(await changes.setCompletion(id, '2026-10-25', true)).toMatchObject({
      ok: false,
      error: expect.stringContaining('yet'),
    });
    expect(await changes.setCompletion(id, '2026-10-19', true)).toMatchObject({
      ok: false,
      error: expect.stringContaining('before'),
    });
    expect(await changes.setCompletion(id, 'nope', true)).toMatchObject({ ok: false });

    await changes.archiveHabit(id);

    expect(await changes.setCompletion(id, '2026-10-21', true)).toMatchObject({
      ok: false,
      error: expect.stringContaining('Restore'),
    });
    expect(await sql.select('select id from habit_completions')).toEqual([]);
  });
});
