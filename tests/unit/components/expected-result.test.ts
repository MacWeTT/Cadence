import { describe, expect, it } from 'vitest';
import { expectedResult } from '@/components/focus-host/expected-result';
import type { FocusSession } from '@/server/focus-view';

const HABIT = { name: 'Read', icon: '📖', color: 'moss' };

const session = (over: Partial<FocusSession> = {}): FocusSession => {
  return {
    id: 's1',
    habitId: 'h1',
    habit: HABIT,
    mode: 'free',
    plan: null,
    startedAt: '2026-10-24T10:00:00.000Z',
    skippedSeconds: 0,
    pausedAt: null,
    pausedSeconds: 0,
    soundId: null,
    ...over,
  };
};

const at = (iso: string) => {
  return new Date(iso).getTime();
};

describe('what a Stop will answer, worked out on the device', () => {
  it('is the minutes since the start for a free session, kept under the same id, for the start day', () => {
    expect(expectedResult(session(), at('2026-10-24T10:10:00.000Z'), 'UTC')).toEqual({
      sessionId: 's1',
      habitId: 'h1',
      focusSeconds: 600,
      date: '2026-10-24',
      saved: true,
    });
  });

  it('is not saved under a minute, as the server would not keep it', () => {
    expect(expectedResult(session(), at('2026-10-24T10:00:20.000Z'), 'UTC')).toMatchObject({
      focusSeconds: 20,
      saved: false,
    });
  });

  it('leaves paused time out, whether it is over or still on', () => {
    const resumed = session({ pausedSeconds: 300 });
    const holding = session({ pausedAt: '2026-10-24T10:06:00.000Z' });

    expect(expectedResult(resumed, at('2026-10-24T10:10:00.000Z'), 'UTC').focusSeconds).toBe(300);
    expect(expectedResult(holding, at('2026-10-24T10:20:00.000Z'), 'UTC').focusSeconds).toBe(360);
  });

  it('counts only the focus phases of a pomodoro plan, not its breaks', () => {
    const plan = { focusMin: 25, breakMin: 5, longBreakMin: 15, rounds: 4 };
    // 27 minutes in: the first 25 were focus, then 2 minutes of the break
    const result = expectedResult(session({ mode: 'pomodoro', plan }), at('2026-10-24T10:27:00.000Z'), 'UTC');

    expect(result.focusSeconds).toBe(1500);
  });

  it('names the start day in the person timezone, not UTC', () => {
    // 20:00 UTC on the 24th is already 01:30 on the 25th in Kolkata
    const late = session({ startedAt: '2026-10-24T20:00:00.000Z' });

    expect(expectedResult(late, at('2026-10-24T20:30:00.000Z'), 'Asia/Kolkata').date).toBe('2026-10-25');
    expect(expectedResult(late, at('2026-10-24T20:30:00.000Z'), 'UTC').date).toBe('2026-10-24');
  });
});
