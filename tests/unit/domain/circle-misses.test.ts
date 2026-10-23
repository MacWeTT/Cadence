import { describe, expect, it } from 'vitest';
import { missedDays } from '@/domain/circle-misses';
import type { CalendarDate } from '@/domain/dates';
import type { Ctx, HabitData, Schedule } from '@/domain/types';

// 2026-10-14 is a Wednesday.
const CTX: Ctx = { today: '2026-10-14', weekStartsOn: 1 };

const habit = (over: Partial<HabitData> & { schedule?: Schedule; ticks?: CalendarDate[] } = {}): HabitData => {
  const { schedule, ticks, ...rest } = over;

  return {
    startDate: '2026-09-01',
    pauses: [],
    schedules: [schedule ?? { kind: 'daily', effectiveFrom: '2026-09-01' }],
    completions: new Set(ticks ?? []),
    ...rest,
  };
};

describe('missedDays', () => {
  it('lists the days a daily habit was not ticked, oldest first', () => {
    const everyDay: CalendarDate[] = [];

    for (let day = 30; day <= 43; day++) {
      const date = new Date(Date.UTC(2026, 8, day)).toISOString().slice(0, 10);

      if (date !== '2026-10-10' && date !== '2026-10-12') {
        everyDay.push(date);
      }
    }

    expect(missedDays(habit({ ticks: everyDay }), CTX, 14)).toEqual(['2026-10-10', '2026-10-12']);
  });

  it('looks back exactly the days asked for, and never includes today', () => {
    const missed = missedDays(habit(), CTX, 14);

    expect(missed).toHaveLength(14);
    expect(missed[0]).toBe('2026-09-30');
    expect(missed[13]).toBe('2026-10-13');
    expect(missed).not.toContain('2026-10-14');
  });

  it('counts nothing before the habit started', () => {
    expect(
      missedDays(habit({ startDate: '2026-10-11', schedule: { kind: 'daily', effectiveFrom: '2026-10-11' } }), CTX, 14),
    ).toEqual(['2026-10-11', '2026-10-12', '2026-10-13']);
  });

  it('counts only the chosen days of a fixed-day habit', () => {
    const schedule: Schedule = { kind: 'weekdays', days: [1, 3, 5], effectiveFrom: '2026-09-01' };

    expect(missedDays(habit({ schedule }), CTX, 7)).toEqual(['2026-10-07', '2026-10-09', '2026-10-12']);
  });

  it('does not count a paused day, and a tick on any day is honoured', () => {
    const pauses = [{ from: '2026-10-09', to: '2026-10-12' }];
    const missed = missedDays(habit({ pauses, ticks: ['2026-10-12'] }), CTX, 7);

    expect(missed).toEqual(['2026-10-07', '2026-10-08', '2026-10-13']);
  });

  it('counts a weekly habit once its week has ended without the goal, as the last day of that week', () => {
    const schedule: Schedule = { kind: 'weekly_count', timesPerWeek: 3, effectiveFrom: '2026-09-01' };
    // The week of 28 Sep to 4 Oct is met; 5 to 11 Oct had one tick; this week is still going.
    const ticks = ['2026-09-29', '2026-09-30', '2026-10-02', '2026-10-06'];

    expect(missedDays(habit({ schedule, ticks }), CTX, 14)).toEqual(['2026-10-11']);
  });

  it('never calls a week in progress a miss', () => {
    const schedule: Schedule = { kind: 'weekly_count', timesPerWeek: 3, effectiveFrom: '2026-10-01' };

    expect(missedDays(habit({ schedule, startDate: '2026-10-01' }), CTX, 2)).toEqual([]);
  });

  it('has nothing to say about an optional habit', () => {
    const schedule: Schedule = { kind: 'optional', effectiveFrom: '2026-09-01' };

    expect(missedDays(habit({ schedule }), CTX, 14)).toEqual([]);
  });
});
