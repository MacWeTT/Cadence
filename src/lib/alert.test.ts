import { describe, expect, it } from 'vitest';
import { alertFor, clockIn, formatLeft, type AlertInput } from './alert';

const read = { id: 'read', name: 'Read' };
const run = { id: 'run', name: 'Run' };
const atRiskRead = { id: 'read', name: 'Read', count: 12, unit: 'day' as const };

const input = (over: Partial<AlertInput> = {}): AlertInput => {
  return {
    hour: 9,
    minutesToMidnight: 900,
    total: 5,
    open: [read, run],
    atRisk: [],
    continuing: [],
    ...over,
  };
};

describe('formatLeft', () => {
  it('writes hours and minutes, dropping empty parts', () => {
    expect(formatLeft(340)).toBe('5h 40m');
    expect(formatLeft(180)).toBe('3h');
    expect(formatLeft(100)).toBe('1h 40m');
    expect(formatLeft(45)).toBe('45m');
  });
});

describe('alertFor tiers', () => {
  it('says nothing when no habit is listed today, even late', () => {
    expect(alertFor(input({ total: 0, open: [], hour: 23, minutesToMidnight: 30 }))).toEqual({
      tier: 'none',
      message: '',
      action: null,
    });
  });

  it("celebrates when everything is ticked, naming tomorrow's two longest streaks", () => {
    const done = alertFor(
      input({
        total: 3,
        open: [],
        hour: 23,
        minutesToMidnight: 30,
        continuing: [
          { name: 'Journal', count: 31 },
          { name: 'Read', count: 12 },
          { name: 'Run', count: 2 },
        ],
      }),
    );

    expect(done).toEqual({
      tier: 'done',
      message: "All 3 done. Nice. Tomorrow's streaks: Journal 32, Read 13.",
      action: null,
    });
    expect(alertFor(input({ total: 2, open: [] })).message).toBe('All 2 done. Nice.');
  });

  it('gives a last call in the final three hours when a streak is at risk, with a button to that habit', () => {
    expect(alertFor(input({ hour: 22, minutesToMidnight: 100, atRisk: [atRiskRead] }))).toEqual({
      tier: 'late',
      message: "Last call: 1h 40m. Don't lose your 12-day Read streak!",
      action: { kind: 'focus', id: 'read', label: 'Do Read now' },
    });
    const two = alertFor(
      input({
        hour: 22,
        minutesToMidnight: 100,
        atRisk: [atRiskRead, { id: 'run', name: 'Run', count: 3, unit: 'week' }],
      }),
    );

    expect(two.message).toBe("Last call: 1h 40m. Don't lose your 12-day Read streak! And 1 more at risk.");
  });

  it('warns in the evening, naming the streak that ends at midnight', () => {
    expect(alertFor(input({ hour: 18, minutesToMidnight: 340, atRisk: [atRiskRead] }))).toEqual({
      tier: 'evening',
      message: "5h 40m left. Read's 12-day streak ends at midnight.",
      action: { kind: 'focus', id: 'read', label: 'Do Read now' },
    });
  });

  it('warns in the evening without a streak, counting habits to go', () => {
    expect(alertFor(input({ hour: 19, minutesToMidnight: 300 })).message).toBe('5h left. 2 habits to go.');
    expect(alertFor(input({ hour: 19, minutesToMidnight: 300, open: [run] })).message).toBe('5h left. 1 habit to go.');
    expect(alertFor(input({ hour: 19, minutesToMidnight: 300 })).action).toEqual({
      kind: 'focus',
      id: 'read',
      label: 'Do Read now',
    });
  });

  it('nudges gently in the afternoon, linking to Today', () => {
    expect(alertFor(input({ hour: 14, minutesToMidnight: 600 }))).toEqual({
      tier: 'afternoon',
      message: '2 left, 10h to go.',
      action: { kind: 'link', href: '/today', label: 'Open Today' },
    });
  });

  it('starts the day calmly, naming the first open habit', () => {
    expect(alertFor(input())).toEqual({
      tier: 'morning',
      message: '5 habits today. A good day to start with Read.',
      action: null,
    });
    expect(alertFor(input({ total: 1, open: [read] })).message).toBe('1 habit today. A good day to start with Read.');
  });
});

describe('alertFor boundaries', () => {
  const at = (minutes: number, hour: number, atRisk = [atRiskRead]) => {
    return alertFor(input({ hour, minutesToMidnight: minutes, atRisk })).tier;
  };

  it('late needs 180 minutes or less AND a streak at risk', () => {
    expect(at(180, 21)).toBe('late');
    expect(at(181, 21)).toBe('evening');
    expect(at(120, 22, [])).toBe('evening');
  });
  it('evening starts at 360 minutes to midnight, afternoon at noon', () => {
    expect(at(360, 18, [])).toBe('evening');
    expect(at(361, 17, [])).toBe('afternoon');
    expect(at(720, 12, [])).toBe('afternoon');
    expect(at(780, 11, [])).toBe('morning');
  });
  it('a streak at risk never turns the banner amber before six in the evening', () => {
    expect(at(600, 14)).toBe('afternoon');
    expect(at(900, 9)).toBe('morning');
  });
});

describe('clockIn', () => {
  it('reads the local date, hour, weekday and minutes to midnight in the given timezone', () => {
    expect(clockIn('UTC', new Date('2026-10-09T23:59:00Z'))).toEqual({
      date: '2026-10-09',
      hour: 23,
      weekday: 5,
      minutesToMidnight: 1,
    });
    expect(clockIn('UTC', new Date('2026-10-10T00:00:00Z'))).toEqual({
      date: '2026-10-10',
      hour: 0,
      weekday: 6,
      minutesToMidnight: 1440,
    });
  });
  it('follows the profile timezone, including half-hour zones, not the browser', () => {
    expect(clockIn('Asia/Kolkata', new Date('2026-10-09T20:00:00Z'))).toEqual({
      date: '2026-10-10',
      hour: 1,
      weekday: 6,
      minutesToMidnight: 1350,
    });
    expect(clockIn('America/New_York', new Date('2026-10-09T04:30:00Z'))).toEqual({
      date: '2026-10-09',
      hour: 0,
      weekday: 5,
      minutesToMidnight: 1410,
    });
  });
});
