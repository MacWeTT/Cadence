import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAccountChanges, readBackup, replaceData } from '@/data/local/backup';
import { createChanges } from '@/data/local/changes';
import { createFocusChanges } from '@/data/local/focus-changes';
import { migrate } from '@/data/local/migrations';
import { createReads } from '@/data/local/reads';
import { toJson } from '@/lib/backup';
import { memorySql } from '@tests/unit/data/local/memory-sql';

const NOW = new Date('2026-10-24T12:00:00Z');

const habit = (over: Record<string, unknown> = {}) => {
  return { name: 'Read', icon: '📖', color: 'moss', kind: 'daily', startDate: '2026-10-20', links: [], ...over };
};

const fresh = async () => {
  const sql = memorySql();

  await migrate(sql);

  return sql;
};

/** A file with a habit that has ticks, a pause, a weekdays schedule and a finished focus session. */
const filled = async () => {
  const sql = await fresh();
  const changes = createChanges(sql);
  const focus = createFocusChanges(sql);

  await changes.createHabit(habit({ links: ['https://a.example'], description: 'pages' }));
  vi.setSystemTime(new Date(NOW.getTime() + 1000)); // habits are read in creation order
  await changes.createHabit(habit({ name: 'Run', kind: 'weekdays', weekdays: [1, 3] }));

  const [{ id }] = await sql.select<{ id: string }>("select id from habits where name = 'Read'");
  const [{ id: runId }] = await sql.select<{ id: string }>("select id from habits where name = 'Run'");

  await changes.setCompletion(id, '2026-10-21', true);
  await changes.setCompletion(id, '2026-10-22', true);
  await focus.startFocus({
    habitId: id,
    mode: 'pomodoro',
    plan: { focusMin: 25, breakMin: 5, longBreakMin: 15, rounds: 4 },
    soundId: null,
  });
  vi.setSystemTime(new Date(NOW.getTime() + 30 * 60_000));
  await focus.stopFocus();
  await changes.archiveHabit(runId);

  return sql;
};

describe('the local backup', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads every habit with its schedules, ticks, pauses and finished focus sessions', async () => {
    const backup = await readBackup(await filled());

    expect(backup).toMatchObject({ app: 'cadence', profile: { timezone: 'UTC', weekStartsOn: 1 } });
    expect(
      backup.habits.map(({ name }) => {
        return name;
      }),
    ).toEqual(['Read', 'Run']);

    const [read, run] = backup.habits;

    expect(read).toMatchObject({
      description: 'pages',
      links: ['https://a.example'],
      ticks: ['2026-10-21', '2026-10-22'],
    });
    expect(read.focusSessions).toMatchObject([{ mode: 'pomodoro', focusSeconds: 1500 }]);
    expect(run.schedules).toMatchObject([{ kind: 'weekdays', weekdays: [1, 3], effectiveFrom: '2026-10-20' }]);
    expect(run).toMatchObject({ pauses: [{ archivedOn: '2026-10-24', restoredOn: null }] });
    expect(run.archivedAt).not.toBeNull();
  });

  it('replaces the file with a backup, and reading it back gives the same backup', async () => {
    const before = await readBackup(await filled());
    const sql = await fresh();

    await createChanges(sql).createHabit(habit({ name: 'Old' }));
    await replaceData(sql, before);

    expect(await readBackup(sql)).toEqual(before);
    expect(await sql.select('select name from habits order by name')).toEqual([{ name: 'Read' }, { name: 'Run' }]);
  });

  it('imports a file, answering how much it brought in, and shows the habits afterwards', async () => {
    const text = toJson(await readBackup(await filled()));
    const sql = await fresh();
    const result = await createAccountChanges(sql).importBackup(fileOf(text));

    expect(result).toEqual({ ok: true, summary: { habits: 2, ticks: 2, focusSessions: 1 } });
    expect((await createReads(sql).habits()).active).toHaveLength(1);
    expect((await createReads(sql).habits()).archived).toHaveLength(1);
  });

  it('refuses a file that is not a backup, or has a tick before the start, and leaves the data alone', async () => {
    const sql = await filled();
    const { importBackup } = createAccountChanges(sql);
    const backup = await readBackup(sql);

    backup.habits[0].ticks = ['2026-10-01'];

    expect(await importBackup(fileOf('not json'))).toMatchObject({ ok: false, error: expect.any(String) });
    expect(await importBackup(fileOf(toJson(backup)))).toMatchObject({ ok: false });
    expect(await importBackup(new FormData())).toMatchObject({ ok: false });
    expect(await sql.select('select id from habits')).toHaveLength(2);
  });

  it('deletes everything on the PC and puts the settings back to their start', async () => {
    const sql = await filled();

    await sql.batch([{ query: "update profile set tag = 'mac', display_name = 'Mac'" }]);

    expect(await createAccountChanges(sql).deleteAccount('')).toEqual({ ok: true });

    for (const table of ['habits', 'habit_schedules', 'habit_completions', 'habit_archive_periods', 'focus_sessions']) {
      expect(await sql.select(`select * from ${table}`)).toEqual([]);
    }

    expect(await sql.select('select tag, display_name from profile')).toEqual([{ tag: 'me', display_name: null }]);
  });
});

const fileOf = (text: string): FormData => {
  const form = new FormData();

  form.set('file', new File([text], 'backup.json', { type: 'application/json' }));

  return form;
};
