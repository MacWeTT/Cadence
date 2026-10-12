import { describe, expect, it } from 'vitest';
import { PRESETS } from '@/domain/focus';
import { focusByHabit, lastSoundsOf, parsePlan, settle, toSession, type FocusRow } from '@/server/focus-view';

const row = (over: Partial<FocusRow> = {}): FocusRow => {
  return {
    id: 's1',
    habit_id: 'h1',
    started_at: '2026-10-12T09:00:00Z',
    ended_at: null,
    mode: 'free',
    plan: null,
    skipped_seconds: 0,
    focus_seconds: null,
    sound_id: null,
    ...over,
  };
};

describe('parsePlan', () => {
  it('reads a stored plan', () => {
    expect(parsePlan(PRESETS.classic)).toEqual(PRESETS.classic);
  });

  it('gives null for anything that is not a valid plan', () => {
    expect(parsePlan(null)).toBeNull();
    expect(parsePlan({ focusMin: 25 })).toBeNull();
    expect(parsePlan({ ...PRESETS.classic, rounds: 99 })).toBeNull();
  });
});

describe('toSession', () => {
  it('maps a row for the browser, with the habit it belongs to', () => {
    const habit = { name: 'Read', icon: 'book', color: 'moss' };
    const session = toSession(row({ mode: 'pomodoro', plan: PRESETS.classic, skipped_seconds: 30 }), habit);

    expect(session).toEqual({
      id: 's1',
      habitId: 'h1',
      habit,
      mode: 'pomodoro',
      plan: PRESETS.classic,
      startedAt: '2026-10-12T09:00:00Z',
      skippedSeconds: 30,
      soundId: null,
    });
  });

  it('carries the sound chosen for the session', () => {
    const habit = { name: 'Read', icon: 'book', color: 'moss' };

    expect(toSession(row({ sound_id: 'marimba' }), habit).soundId).toBe('marimba');
  });
});

describe('lastSoundsOf', () => {
  it('remembers the sound last chosen on each habit, newest session first', () => {
    expect(
      lastSoundsOf([
        { habit_id: 'h1', sound_id: 'marimba' },
        { habit_id: 'h2', sound_id: 'wood' },
        { habit_id: 'h1', sound_id: 'beep' },
      ]),
    ).toEqual({ h1: 'marimba', h2: 'wood' });
  });

  it('remembers nothing for a habit whose latest session used the default', () => {
    expect(
      lastSoundsOf([
        { habit_id: 'h1', sound_id: null },
        { habit_id: 'h1', sound_id: 'marimba' },
      ]),
    ).toEqual({});
  });

  it('is empty with no sessions', () => {
    expect(lastSoundsOf([])).toEqual({});
  });
});

describe('settle, free', () => {
  it('counts every second up to now', () => {
    const r = settle(row(), new Date('2026-10-12T09:10:00Z'));

    expect(r).toEqual({ endedAt: '2026-10-12T09:10:00.000Z', focusSeconds: 600, expired: false });
  });

  it('is closed at the 8 hour cap when left running', () => {
    const r = settle(row(), new Date('2026-10-13T09:00:00Z'));

    expect(r).toEqual({ endedAt: '2026-10-12T17:00:00.000Z', focusSeconds: 8 * 3600, expired: true });
  });
});

describe('settle, pomodoro', () => {
  const pomodoro = (over: Partial<FocusRow> = {}) => {
    return row({ mode: 'pomodoro', plan: PRESETS.classic, ...over });
  };

  it('counts focus only: a stop inside the first break keeps one full round', () => {
    const r = settle(pomodoro(), new Date('2026-10-12T09:27:00Z'));

    expect(r).toEqual({ endedAt: '2026-10-12T09:27:00.000Z', focusSeconds: 25 * 60, expired: false });
  });

  it('closes a finished plan at its own end with the planned focus', () => {
    const r = settle(pomodoro(), new Date('2026-10-12T20:00:00Z'));

    expect(r).toEqual({ endedAt: '2026-10-12T10:55:00.000Z', focusSeconds: 100 * 60, expired: true });
  });

  it('lets skipped break time bring the end earlier', () => {
    const r = settle(pomodoro({ skipped_seconds: 5 * 60 }), new Date('2026-10-12T20:00:00Z'));

    expect(r).toEqual({ endedAt: '2026-10-12T10:50:00.000Z', focusSeconds: 100 * 60, expired: true });
  });

  it('treats a row with a broken plan as free so it can still be closed', () => {
    const r = settle(pomodoro({ plan: { nope: 1 } }), new Date('2026-10-12T09:05:00Z'));

    expect(r.focusSeconds).toBe(300);
  });
});

describe('focusByHabit', () => {
  const done = (habit: string, startedAt: string, seconds: number) => {
    return { habitId: habit, startedAt, focusSeconds: seconds };
  };

  it('adds up seconds per habit inside the window and a total', () => {
    const result = focusByHabit(
      [
        done('h1', '2026-10-10T09:00:00Z', 1500),
        done('h1', '2026-10-11T09:00:00Z', 600),
        done('h2', '2026-10-11T10:00:00Z', 900),
        done('h1', '2026-09-01T09:00:00Z', 9999),
      ],
      '2026-10-05',
      '2026-10-12',
      'UTC',
    );

    expect(result.totalSeconds).toBe(3000);
    expect(result.byHabit).toEqual([
      { habitId: 'h1', seconds: 2100 },
      { habitId: 'h2', seconds: 900 },
    ]);
  });

  it('belongs to the day the session started, in the person’s timezone', () => {
    // 23:30 UTC on the 11th is already the 12th in Auckland (UTC+13), and still the 11th in New York
    const sessions = [done('h1', '2026-10-11T23:30:00Z', 600)];

    expect(focusByHabit(sessions, '2026-10-12', '2026-10-12', 'Pacific/Auckland').totalSeconds).toBe(600);
    expect(focusByHabit(sessions, '2026-10-12', '2026-10-12', 'America/New_York').totalSeconds).toBe(0);
    expect(focusByHabit(sessions, '2026-10-11', '2026-10-11', 'America/New_York').totalSeconds).toBe(600);
  });

  it('keeps a session that runs past midnight on its start day', () => {
    const sessions = [done('h1', '2026-10-11T23:50:00Z', 3600)];

    expect(focusByHabit(sessions, '2026-10-11', '2026-10-11', 'UTC').totalSeconds).toBe(3600);
    expect(focusByHabit(sessions, '2026-10-12', '2026-10-12', 'UTC').totalSeconds).toBe(0);
  });

  it('puts the habit with the most time first and is empty with no sessions', () => {
    const result = focusByHabit(
      [done('a', '2026-10-10T09:00:00Z', 60), done('b', '2026-10-10T09:00:00Z', 120)],
      '2026-10-01',
      '2026-10-12',
      'UTC',
    );

    expect(
      result.byHabit.map(h => {
        return h.habitId;
      }),
    ).toEqual(['b', 'a']);
    expect(focusByHabit([], '2026-10-01', '2026-10-12', 'UTC')).toEqual({ totalSeconds: 0, byHabit: [] });
  });
});
