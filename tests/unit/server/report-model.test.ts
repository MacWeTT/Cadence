import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import type { Backup, BackupHabit } from '@/lib/backup-types';
import { buildReport, HEAT_WEEKS } from '@/server/report-model';

const TODAY = '2026-10-12'; // a Monday

const habit = (over: Partial<BackupHabit> = {}): BackupHabit => {
  return {
    name: 'Read',
    description: null,
    icon: '📖',
    color: 'moss',
    startDate: '2026-09-01',
    createdAt: null,
    links: [],
    archivedAt: null,
    schedules: [{ kind: 'daily', timesPerWeek: null, weekdays: null, effectiveFrom: '2026-09-01' }],
    ticks: [],
    pauses: [],
    focusSessions: [],
    ...over,
  };
};

const backup = (habits: BackupHabit[]): Backup => {
  return {
    app: 'cadence',
    version: 1,
    exportedAt: '2026-10-12T08:00:00.000Z',
    profile: { name: 'Manas', timezone: 'UTC', weekStartsOn: 1 },
    habits,
  };
};

const lastDays = (count: number): string[] => {
  return Array.from({ length: count }, (_, i) => {
    return addDays(TODAY, -i);
  });
};

describe('buildReport', () => {
  it('counts the account: habits, check-ins and focus hours', () => {
    const report = buildReport(
      backup([
        habit({
          ticks: lastDays(3),
          focusSessions: [
            {
              startedAt: '2026-10-01T07:00:00Z',
              endedAt: '2026-10-01T08:00:00Z',
              mode: 'free',
              plan: null,
              skippedSeconds: 0,
              focusSeconds: 5400,
            },
          ],
        }),
        habit({ name: 'Run', ticks: lastDays(2) }),
      ]),
      TODAY,
      1,
    );

    expect(report).toMatchObject({ name: 'Manas', today: TODAY, totals: { habits: 2, ticks: 5, focusMinutes: 90 } });
  });

  it('works out the streaks, the 30 and 90 day rates, and the totals of one habit', () => {
    const [read] = buildReport(backup([habit({ ticks: lastDays(5), focusSessions: [] })]), TODAY, 1).habits;

    expect(read).toMatchObject({
      name: 'Read',
      color: 'moss',
      current: { unit: 'day', count: 5 },
      longest: { unit: 'day', count: 5 },
      ticks: 5,
      focusMinutes: 0,
      archived: false,
    });
    // Closed days from 2026-09-13 to 2026-10-11 are expected (29); the four before today are done.
    expect(read.rate30).toBe(14);
    expect(read.rate90).toBe(Math.round((4 / 41) * 100));
  });

  it('has no streak or rate for an optional habit, and no rate when nothing was expected', () => {
    const [optional] = buildReport(
      backup([
        habit({
          schedules: [{ kind: 'optional', timesPerWeek: null, weekdays: null, effectiveFrom: '2026-09-01' }],
          ticks: lastDays(3),
        }),
      ]),
      TODAY,
      1,
    ).habits;

    expect(optional).toMatchObject({ current: null, longest: null, rate30: null, rate90: null, ticks: 3 });
  });

  it('marks a habit that is archived now', () => {
    const [archived] = buildReport(
      backup([habit({ archivedAt: '2026-10-01T10:00:00Z', pauses: [{ archivedOn: '2026-10-01', restoredOn: null }] })]),
      TODAY,
      1,
    ).habits;

    expect(archived.archived).toBe(true);
  });

  it('draws a year of days: done, missed, none and not yet, by week', () => {
    const [read] = buildReport(backup([habit({ ticks: ['2026-10-12', '2026-10-10'] })]), TODAY, 1).habits;
    const { heat } = read;

    expect(heat).toHaveLength(HEAT_WEEKS);
    expect(
      heat.every(week => {
        return week.length === 7;
      }),
    ).toBe(true);

    const last = heat.at(-1);

    // The last column is the week of Monday 12 October: Monday done, the rest of the week not yet.
    expect(last?.[0]).toBe('done');
    expect(
      last?.slice(1).every(cell => {
        return cell === 'future';
      }),
    ).toBe(true);
    // Saturday 10 October is ticked, Sunday 11 October was missed.
    expect(heat.at(-2)?.[5]).toBe('done');
    expect(heat.at(-2)?.[6]).toBe('missed');
    // Before the habit started there is nothing.
    expect(
      heat[0].every(cell => {
        return cell === 'none';
      }),
    ).toBe(true);
  });

  it('is fine with no habits', () => {
    expect(buildReport(backup([]), TODAY, 1)).toMatchObject({
      totals: { habits: 0, ticks: 0, focusMinutes: 0 },
      habits: [],
    });
  });
});
