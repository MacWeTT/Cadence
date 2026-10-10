import { describe, expect, it } from 'vitest';
import { addDays, diffDays, toCalendarDate, todayIn, weekEnd, weekStart } from './dates';

describe('todayIn', () => {
  it('rolls over at local midnight in Kolkata', () => {
    expect(todayIn('Asia/Kolkata', new Date('2026-10-09T18:29:59Z'))).toBe('2026-10-09');
    expect(todayIn('Asia/Kolkata', new Date('2026-10-09T18:30:00Z'))).toBe('2026-10-10');
  });

  it('handles the spring-forward week in New York', () => {
    expect(todayIn('America/New_York', new Date('2026-03-09T03:59:59Z'))).toBe('2026-03-08');
    expect(todayIn('America/New_York', new Date('2026-03-09T04:00:00Z'))).toBe('2026-03-09');
  });

  it('handles the fall-back week in New York', () => {
    expect(todayIn('America/New_York', new Date('2026-11-02T04:59:59Z'))).toBe('2026-11-01');
    expect(todayIn('America/New_York', new Date('2026-11-02T05:00:00Z'))).toBe('2026-11-02');
  });

  it('throws on an invalid timezone instead of returning a wrong date', () => {
    expect(() => {
      return todayIn('Not/AZone');
    }).toThrow();
  });
});

describe('addDays', () => {
  it('moves across month, year and DST boundaries', () => {
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('diffDays', () => {
  it('counts calendar days (b minus a)', () => {
    expect(diffDays('2026-03-01', '2026-03-31')).toBe(30);
    expect(diffDays('2026-10-09', '2026-10-05')).toBe(-4);
  });
});

describe('weekStart / weekEnd', () => {
  it('finds the Monday-based week', () => {
    expect(weekStart('2026-10-09', 1)).toBe('2026-10-05');
    expect(weekEnd('2026-10-09', 1)).toBe('2026-10-11');
  });

  it('finds the Sunday-based week', () => {
    expect(weekStart('2026-10-09', 7)).toBe('2026-10-04');
  });

  it('puts a Sunday in the previous Monday-based week', () => {
    expect(weekStart('2026-10-04', 1)).toBe('2026-09-28');
  });
});

describe('toCalendarDate', () => {
  it('gives the calendar date of an instant in a timezone', () => {
    expect(toCalendarDate('2026-10-09T20:00:00Z', 'Asia/Kolkata')).toBe('2026-10-10');
    expect(toCalendarDate('2026-10-09T20:00:00Z', 'America/New_York')).toBe('2026-10-09');
    expect(toCalendarDate(new Date('2026-10-09T20:00:00Z'), 'UTC')).toBe('2026-10-09');
  });
});
