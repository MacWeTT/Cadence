import { describe, expect, it } from 'vitest';
import { weekdayOf } from '@/domain/dates';
import { isListedOn, yearTicks } from '@/domain/listing';
import { completionRate } from '@/domain/rates';
import { isOffDay, parseScheduleInput } from '@/domain/schedule';
import { planScheduleChange } from '@/domain/schedule-change';
import { dayStatus } from '@/domain/status';
import { currentStreak, longestStreak } from '@/domain/streaks';
import type { Schedule } from '@/domain/types';
import { ctx, makeHabit } from '@tests/support/habits';

// 2026-10-05 is a Monday, so 10-09 is a Friday. A Monday, Wednesday and Friday habit starting 10-01 (a Thursday).
const mwf: Schedule = { kind: 'weekdays', days: [1, 3, 5], effectiveFrom: '2026-10-01' };
const optional: Schedule = { kind: 'optional', effectiveFrom: '2026-10-01' };

describe('weekdayOf', () => {
  it('numbers the days Monday 1 to Sunday 7', () => {
    expect(weekdayOf('2026-10-05')).toBe(1);
    expect(weekdayOf('2026-10-09')).toBe(5);
    expect(weekdayOf('2026-10-11')).toBe(7);
  });
});

describe('parseScheduleInput, weekdays and optional', () => {
  it('accepts one to six distinct weekdays and sorts them', () => {
    expect(parseScheduleInput({ kind: 'weekdays', days: [5, 1, 3], effectiveFrom: '2026-10-05' })).toEqual({
      ok: true,
      value: { kind: 'weekdays', days: [1, 3, 5], effectiveFrom: '2026-10-05' },
    });
  });

  it('rejects no days, all seven, repeats and out-of-range days', () => {
    for (const days of [[], [1, 2, 3, 4, 5, 6, 7], [1, 1], [0, 2], [8], ['1'], undefined]) {
      expect(parseScheduleInput({ kind: 'weekdays', days, effectiveFrom: '2026-10-05' }).ok).toBe(false);
    }
  });

  it('accepts an optional schedule with no parameters', () => {
    expect(parseScheduleInput({ kind: 'optional', effectiveFrom: '2026-10-05' })).toEqual({
      ok: true,
      value: { kind: 'optional', effectiveFrom: '2026-10-05' },
    });
    expect(parseScheduleInput({ kind: 'optional', days: [1], effectiveFrom: '2026-10-05' }).ok).toBe(false);
  });
});

describe('dayStatus on fixed weekdays', () => {
  const h = makeHabit({ schedules: [mwf], done: ['2026-10-05', '2026-10-06'] });

  it('judges expected days like a daily habit', () => {
    expect(dayStatus(h, '2026-10-05', ctx())).toBe('done');
    expect(dayStatus(h, '2026-10-07', ctx())).toBe('missed');
    expect(dayStatus(h, '2026-10-09', ctx())).toBe('pending');
  });

  it('expects nothing on the other days, even one that was ticked', () => {
    expect(isOffDay(h, '2026-10-06')).toBe(true);
    expect(dayStatus(h, '2026-10-06', ctx())).toBe('inactive');
    expect(dayStatus(h, '2026-10-08', ctx())).toBe('inactive');
  });
});

describe('streaks on fixed weekdays', () => {
  it('skips the other days instead of breaking on them', () => {
    // Fri 10-02 is expected by a Fri/Mon/Wed habit; done on Fri 10-02, Mon 10-05, Wed 10-07 (today Fri 10-09 pending).
    const h = makeHabit({
      schedules: [{ kind: 'weekdays', days: [1, 3, 5], effectiveFrom: '2026-10-01' }],
      done: ['2026-10-02', '2026-10-05', '2026-10-07'],
    });

    expect(currentStreak(h, ctx())).toEqual({ unit: 'day', count: 3 });
    expect(longestStreak(h, ctx())).toEqual({ unit: 'day', count: 3 });
  });

  it('breaks on a missed expected day', () => {
    const h = makeHabit({ schedules: [mwf], done: ['2026-10-02', '2026-10-07'] }); // Mon 10-05 missed

    expect(currentStreak(h, ctx()).count).toBe(1);
  });

  it('is not carried by a tick on a day that was not expected', () => {
    const h = makeHabit({ schedules: [mwf], done: ['2026-10-06', '2026-10-08'] });

    expect(currentStreak(h, ctx()).count).toBe(0);
  });
});

describe('completionRate on fixed weekdays', () => {
  it('expects only the chosen days', () => {
    const h = makeHabit({ schedules: [mwf], done: ['2026-10-02', '2026-10-05', '2026-10-06'] });

    // closed days 10-01..10-08; expected: Fri 02, Mon 05, Wed 07 -> done 02 and 05; the Tuesday tick adds nothing
    expect(completionRate(h, '2026-10-01', '2026-10-08', ctx())).toEqual({ done: 2, expected: 3 });
  });
});

describe('isListedOn on fixed weekdays', () => {
  const h = makeHabit({ schedules: [mwf], done: ['2026-10-06'] });

  it('lists the chosen days, and another day only if it was ticked', () => {
    expect(isListedOn(h, '2026-10-05', ctx())).toBe(true);
    expect(isListedOn(h, '2026-10-06', ctx())).toBe(true); // ticked
    expect(isListedOn(h, '2026-10-08', ctx())).toBe(false);
  });
});

describe('optional habits', () => {
  const h = makeHabit({ schedules: [optional], done: ['2026-10-02', '2026-10-06', '2025-12-31'] });

  it('expect nothing, have no streak and no rate', () => {
    expect(dayStatus(h, '2026-10-03', ctx())).toBe('inactive');
    expect(currentStreak(h, ctx()).count).toBe(0);
    expect(longestStreak(h, ctx()).count).toBe(0);
    expect(completionRate(h, '2026-10-01', '2026-10-08', ctx())).toEqual({ done: 0, expected: 0 });
  });

  it('are listed every day, and count the ticks of the year', () => {
    expect(isListedOn(h, '2026-10-09', ctx())).toBe(true);
    expect(yearTicks(h, '2026-10-09')).toBe(2);
    expect(yearTicks(h, '2025-06-01')).toBe(1);
  });
});

describe('planScheduleChange with the new kinds', () => {
  const base = { startDate: '2026-09-01', today: '2026-10-09', weekStartsOn: 1 as const };

  it('starts a switch to fixed weekdays next week once there is history', () => {
    expect(
      planScheduleChange({
        ...base,
        schedules: [{ kind: 'daily', effectiveFrom: '2026-09-01' }],
        desired: { kind: 'weekdays', days: [1, 3, 5] },
        hasCompletions: true,
      }),
    ).toEqual({ action: 'upsert', schedule: { kind: 'weekdays', days: [1, 3, 5], effectiveFrom: '2026-10-12' } });
  });

  it('treats the same days as no change, whatever their order', () => {
    expect(
      planScheduleChange({
        ...base,
        schedules: [{ kind: 'weekdays', days: [1, 3, 5], effectiveFrom: '2026-09-01' }],
        desired: { kind: 'weekdays', days: [5, 1, 3] },
        hasCompletions: true,
      }),
    ).toEqual({ action: 'none' });
  });

  it('replaces everything for a habit with no ticks, including a switch to optional', () => {
    expect(
      planScheduleChange({
        ...base,
        schedules: [{ kind: 'daily', effectiveFrom: '2026-09-01' }],
        desired: { kind: 'optional' },
        hasCompletions: false,
      }),
    ).toEqual({ action: 'replace_all', schedule: { kind: 'optional', effectiveFrom: '2026-09-01' } });
  });
});
