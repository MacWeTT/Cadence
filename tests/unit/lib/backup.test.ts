import { describe, expect, it } from 'vitest';
import { BACKUP_LIMITS, type Backup } from '@/lib/backup-types';
import { backupFileName, parseBackup, summarize, toJson } from '@/lib/backup';
import { toCsv } from '@/lib/backup-csv';

const TODAY = '2026-10-12';

const backup: Backup = {
  app: 'cadence',
  version: 1,
  exportedAt: '2026-10-12T08:00:00.000Z',
  profile: { name: 'Manas', timezone: 'Asia/Kolkata', weekStartsOn: 1 },
  habits: [
    {
      name: 'Read, daily',
      description: 'Ten "pages"\nbefore bed',
      icon: '📖',
      color: 'moss',
      startDate: '2026-09-01',
      createdAt: '2026-09-01T08:00:00.000Z',
      links: ['https://example.com/a', 'https://example.com/b?x=1,2'],
      archivedAt: null,
      schedules: [
        { kind: 'daily', timesPerWeek: null, weekdays: null, effectiveFrom: '2026-09-01' },
        { kind: 'weekly_count', timesPerWeek: 3, weekdays: null, effectiveFrom: '2026-09-21' },
      ],
      ticks: ['2026-09-01', '2026-09-02', '2026-10-12'],
      pauses: [],
      focusSessions: [
        {
          startedAt: '2026-09-02T07:00:00.000Z',
          endedAt: '2026-09-02T07:50:00.000Z',
          mode: 'pomodoro',
          plan: { focusMin: 25, breakMin: 5, longBreakMin: 15, rounds: 2 },
          skippedSeconds: 30,
          focusSeconds: 3000,
        },
        {
          startedAt: '2026-09-03T07:00:00.000Z',
          endedAt: '2026-09-03T07:10:00.000Z',
          mode: 'free',
          plan: null,
          skippedSeconds: 0,
          focusSeconds: 600,
        },
      ],
    },
    {
      name: '=Run',
      description: null,
      icon: '🏃',
      color: 'clay',
      startDate: '2026-09-01',
      createdAt: null,
      links: [],
      archivedAt: '2026-10-01T10:00:00.000Z',
      schedules: [{ kind: 'weekdays', timesPerWeek: null, weekdays: [1, 3, 5], effectiveFrom: '2026-09-01' }],
      ticks: ['2026-09-02'],
      pauses: [
        { archivedOn: '2026-09-15', restoredOn: '2026-09-20' },
        { archivedOn: '2026-10-01', restoredOn: null },
      ],
      focusSessions: [],
    },
  ],
};

const parseJson = (value: unknown, name = 'x.json') => {
  return parseBackup(typeof value === 'string' ? value : JSON.stringify(value), name, TODAY);
};

const habit = (over: Record<string, unknown> = {}) => {
  return { ...backup.habits[0], ...over };
};

const withHabit = (over: Record<string, unknown>) => {
  return { ...backup, habits: [habit(over)] };
};

describe('JSON', () => {
  it('reads back what it wrote', () => {
    const result = parseJson(toJson(backup));

    expect(result).toMatchObject({ ok: true, backup });
  });

  it('counts what is in the file', () => {
    expect(summarize(backup)).toEqual({ habits: 2, ticks: 4, focusSessions: 2 });
    expect(parseJson(toJson(backup))).toMatchObject({ summary: { habits: 2, ticks: 4, focusSessions: 2 } });
  });
});

describe('CSV', () => {
  it('reads back what it wrote, quotes, commas, line breaks, emoji and a leading = included', () => {
    const text = toCsv(backup);

    expect(parseBackup(text, 'cadence.csv', TODAY)).toMatchObject({ ok: true, backup });
  });

  it('writes a header, one row per record, and a plain-text guard before a leading =', () => {
    const lines = toCsv(backup).split('\r\n');

    expect(lines[0]).toContain('record,habit,name');
    expect(
      lines.filter(line => {
        return line.startsWith('tick,');
      }).length,
    ).toBe(4);
    expect(toCsv(backup)).toContain("'=Run");
  });

  it('knows a CSV by its content when the file has no extension', () => {
    expect(parseBackup(toCsv(backup), 'backup', TODAY)).toMatchObject({ ok: true });
  });

  it('refuses a date a spreadsheet has rewritten, naming the row', () => {
    const text = toCsv(backup).replace(',2026-09-02,', ',9/2/26,');
    const result = parseBackup(text, 'a.csv', TODAY);

    expect(result).toMatchObject({ ok: false, error: { code: 'badCsvDate', values: { value: '9/2/26' } } });
  });

  it('ignores columns it does not know, and refuses a row for a habit that is not there', () => {
    const extra = toCsv(backup)
      .split('\r\n')
      .map((line, i) => {
        return i === 0 ? `${line},notes` : line === '' ? line : `${line},x`;
      })
      .join('\r\n');

    expect(parseBackup(extra, 'a.csv', TODAY)).toMatchObject({ ok: true });
    expect(parseBackup(`${toCsv(backup)}tick,9,,,,,,,,,,,,2026-09-04\r\n`, 'a.csv', TODAY)).toMatchObject({
      ok: false,
      error: { code: 'badCsv' },
    });
  });

  it('refuses text that is not CSV', () => {
    expect(parseBackup('hello', 'a.csv', TODAY)).toMatchObject({ ok: false, error: { code: 'notBackup' } });
    expect(parseBackup('a,"b', 'a.csv', TODAY)).toMatchObject({ ok: false, error: { code: 'unreadable' } });
  });
});

describe('refusals', () => {
  it('refuses text that is not JSON, and JSON that is not a Cadence backup', () => {
    expect(parseJson('{nope')).toMatchObject({ ok: false, error: { code: 'unreadable' } });
    expect(parseJson({ hello: 1 })).toMatchObject({ ok: false, error: { code: 'notBackup' } });
    expect(parseJson({ ...backup, app: 'other' })).toMatchObject({ ok: false, error: { code: 'notBackup' } });
    expect(parseJson('[]')).toMatchObject({ ok: false, error: { code: 'notBackup' } });
  });

  it('refuses a file from a newer version of Cadence', () => {
    expect(parseJson({ ...backup, version: 2 })).toMatchObject({ ok: false, error: { code: 'newerVersion' } });
  });

  it('refuses a file over the size limit, and too many habits, check-ins or focus sessions, naming the numbers', () => {
    expect(parseJson('x'.repeat(BACKUP_LIMITS.bytes + 1))).toMatchObject({ ok: false, error: { code: 'tooBig' } });

    const manyHabits = {
      ...backup,
      habits: Array.from({ length: BACKUP_LIMITS.habits + 1 }, () => {
        return habit();
      }),
    };

    expect(parseJson(manyHabits)).toMatchObject({
      ok: false,
      error: { code: 'tooMany', values: { count: BACKUP_LIMITS.habits + 1, limit: BACKUP_LIMITS.habits } },
    });
  });

  it('refuses a bad habit, naming where', () => {
    expect(parseJson(withHabit({ name: '  ' }))).toMatchObject({ ok: false, error: { code: 'invalid' } });
    expect(parseJson(withHabit({ name: 'x'.repeat(81) }))).toMatchObject({ ok: false });
    expect(parseJson(withHabit({ color: 'neon' }))).toMatchObject({ ok: false });
    expect(parseJson(withHabit({ icon: 'ab' }))).toMatchObject({ ok: false });
    expect(parseJson(withHabit({ links: ['ftp://x'] }))).toMatchObject({ ok: false });
    expect(parseJson(withHabit({ startDate: '2026-13-40' }))).toMatchObject({ ok: false });

    const result = parseJson(withHabit({ name: '' }));

    expect(result).toMatchObject({ ok: false, error: { values: { where: 'habit 1' } } });
  });

  it('refuses a bad schedule', () => {
    expect(parseJson(withHabit({ schedules: [] }))).toMatchObject({ ok: false });
    expect(
      parseJson(
        withHabit({
          schedules: [{ kind: 'weekly_count', timesPerWeek: 9, weekdays: null, effectiveFrom: '2026-09-01' }],
        }),
      ),
    ).toMatchObject({ ok: false });
    expect(
      parseJson(
        withHabit({
          schedules: [{ kind: 'weekdays', timesPerWeek: null, weekdays: [1, 1], effectiveFrom: '2026-09-01' }],
        }),
      ),
    ).toMatchObject({ ok: false });
    expect(
      parseJson(
        withHabit({
          schedules: [
            { kind: 'daily', timesPerWeek: null, weekdays: null, effectiveFrom: '2026-09-01' },
            { kind: 'optional', timesPerWeek: null, weekdays: null, effectiveFrom: '2026-09-01' },
          ],
        }),
      ),
    ).toMatchObject({ ok: false });
  });

  it('refuses a check-in before the start, after today, or twice on one day', () => {
    expect(parseJson(withHabit({ ticks: ['2026-08-31'] }))).toMatchObject({ ok: false });
    expect(parseJson(withHabit({ ticks: ['2026-10-13'] }))).toMatchObject({ ok: false });
    expect(parseJson(withHabit({ ticks: ['2026-09-02', '2026-09-02'] }))).toMatchObject({ ok: false });
    expect(parseJson(withHabit({ ticks: ['2026-10-12'] }))).toMatchObject({ ok: true });
  });

  it('refuses a pause that ends before it starts, two open pauses, and an archived date that does not match', () => {
    const open = { archivedOn: '2026-10-01', restoredOn: null };

    expect(parseJson(withHabit({ pauses: [{ archivedOn: '2026-10-05', restoredOn: '2026-10-01' }] }))).toMatchObject({
      ok: false,
    });
    expect(
      parseJson(withHabit({ pauses: [open, { ...open, archivedOn: '2026-10-02' }], archivedAt: 'x' })),
    ).toMatchObject({
      ok: false,
    });
    expect(parseJson(withHabit({ pauses: [open], archivedAt: null }))).toMatchObject({ ok: false });
    expect(parseJson(withHabit({ pauses: [], archivedAt: '2026-10-01T10:00:00.000Z' }))).toMatchObject({ ok: false });
  });

  it('refuses a focus session that ends before it starts, a free one with a plan, and a pomodoro with a bad plan', () => {
    const session = backup.habits[0].focusSessions[1];

    expect(
      parseJson(withHabit({ focusSessions: [{ ...session, endedAt: '2026-09-03T06:00:00.000Z' }] })),
    ).toMatchObject({
      ok: false,
    });
    expect(
      parseJson(
        withHabit({
          focusSessions: [{ ...session, plan: { focusMin: 25, breakMin: 5, longBreakMin: 15, rounds: 4 } }],
        }),
      ),
    ).toMatchObject({ ok: false });
    expect(
      parseJson(
        withHabit({
          focusSessions: [
            { ...session, mode: 'pomodoro', plan: { focusMin: 999, breakMin: 5, longBreakMin: 15, rounds: 4 } },
          ],
        }),
      ),
    ).toMatchObject({ ok: false });
  });

  it('accepts a backup with no habits', () => {
    expect(parseJson({ ...backup, habits: [] })).toMatchObject({ ok: true, summary: { habits: 0 } });
  });
});

describe('backupFileName', () => {
  it('names the file by the day, with the right extension', () => {
    expect(backupFileName('2026-10-12', 'json')).toBe('cadence-2026-10-12.json');
    expect(backupFileName('2026-10-12', 'pdf')).toBe('cadence-2026-10-12.pdf');
  });
});
