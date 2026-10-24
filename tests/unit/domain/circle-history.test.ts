import { describe, expect, it } from 'vitest';
import { historyWeeks } from '@/domain/circle-history';

// 2026-10-14 is a Wednesday.
const TODAY = '2026-10-14';

describe('historyWeeks', () => {
  it('gives the asked number of weeks, oldest first, each with seven days', () => {
    const weeks = historyWeeks([], TODAY, 1, 4);

    expect(weeks).toHaveLength(4);
    expect(
      weeks.every(week => {
        return week.length === 7;
      }),
    ).toBe(true);
  });

  it('starts each week on the owner week start and ends on the week holding today', () => {
    const monday = historyWeeks([], TODAY, 1, 2);

    expect(monday[1][0].date).toBe('2026-10-12');
    expect(monday[0][0].date).toBe('2026-10-05');

    const sunday = historyWeeks([], TODAY, 7, 2);

    expect(sunday[1][0].date).toBe('2026-10-11');
  });

  it('marks the days that were ticked', () => {
    const weeks = historyWeeks(['2026-10-12', '2026-10-06'], TODAY, 1, 2);

    expect(weeks[1][0]).toMatchObject({ date: '2026-10-12', done: true });
    expect(weeks[0][1]).toMatchObject({ date: '2026-10-06', done: true });
    expect(weeks[1][1]).toMatchObject({ date: '2026-10-13', done: false });
  });

  it('marks the days after today as not yet, so they are never read as missed', () => {
    const week = historyWeeks([], TODAY, 1, 1)[0];

    expect(
      week.map(day => {
        return day.future;
      }),
    ).toEqual([false, false, false, true, true, true, true]);
  });

  it('has no field that says a day was missed', () => {
    expect(Object.keys(historyWeeks([], TODAY, 1, 1)[0][0]).sort()).toEqual(['date', 'done', 'future']);
  });
});
