import { describe, expect, it } from 'vitest';
import {
  FREE_CAP_SECONDS,
  PRESETS,
  activeSeconds,
  breakLeftAt,
  focusSecondsAt,
  freeFocusSeconds,
  isSavedSession,
  pausedTooLong,
  phaseAt,
  planErrors,
  totalSeconds,
  usesLongBreak,
} from '@/domain/focus';

const classic = PRESETS.classic;
const tiny = { focusMin: 1, breakMin: 1, longBreakMin: 2, rounds: 5 };

describe('presets and limits', () => {
  it('has Classic 25/5, Deep 50/10 and Short 15/3', () => {
    expect(PRESETS.classic).toEqual({ focusMin: 25, breakMin: 5, longBreakMin: 15, rounds: 4 });
    expect(PRESETS.deep).toMatchObject({ focusMin: 50, breakMin: 10 });
    expect(PRESETS.short).toMatchObject({ focusMin: 15, breakMin: 3 });
  });

  it('accepts a plan inside the limits', () => {
    expect(planErrors(classic)).toEqual([]);
  });

  it('names every field outside its limits', () => {
    const bad = { focusMin: 0, breakMin: 61, longBreakMin: 0, rounds: 13 };

    expect(planErrors(bad)).toEqual(['focusMin', 'breakMin', 'longBreakMin', 'rounds']);
  });

  it('refuses fractions and the edges just outside', () => {
    expect(planErrors({ ...classic, focusMin: 180 })).toEqual([]);
    expect(planErrors({ ...classic, focusMin: 181 })).toEqual(['focusMin']);
    expect(planErrors({ ...classic, rounds: 1.5 })).toEqual(['rounds']);
  });
});

describe('totalSeconds', () => {
  it('adds focus rounds and the breaks between them, none after the last', () => {
    expect(totalSeconds(classic)).toBe((100 + 5 + 5 + 5) * 60);
  });

  it('is only the focus for one round', () => {
    expect(totalSeconds({ ...classic, rounds: 1 })).toBe(25 * 60);
  });

  it('puts the long break after every 4th round only', () => {
    // 5 rounds of 1 minute, breaks after 1, 2, 3 (1 minute each) and after 4 (long, 2 minutes)
    expect(totalSeconds(tiny)).toBe((5 + 3 + 2) * 60);
  });
});

describe('phaseAt', () => {
  it('starts in the first focus round', () => {
    expect(phaseAt(classic, 0)).toEqual({ phase: 'focus', round: 1, left: 25 * 60 });
  });

  it('counts down inside a phase', () => {
    expect(phaseAt(classic, 60)).toEqual({ phase: 'focus', round: 1, left: 24 * 60 });
  });

  it('moves to the break at the boundary, naming the round just finished', () => {
    expect(phaseAt(classic, 25 * 60)).toEqual({ phase: 'break', round: 1, left: 5 * 60 });
  });

  it('starts the next focus round when the break ends', () => {
    expect(phaseAt(classic, 30 * 60)).toEqual({ phase: 'focus', round: 2, left: 25 * 60 });
  });

  it('uses the long break after round 4', () => {
    // focus 1, break, focus 2, break, focus 3, break, focus 4 = 7 minutes, then the long break
    expect(phaseAt(tiny, 7 * 60)).toEqual({ phase: 'break', round: 4, left: 2 * 60 });
  });

  it('is done at the end and after', () => {
    expect(phaseAt(classic, totalSeconds(classic))).toEqual({ phase: 'done', round: 4, left: 0 });
    expect(phaseAt(classic, totalSeconds(classic) + 999)).toEqual({ phase: 'done', round: 4, left: 0 });
  });

  it('treats negative elapsed (clock skew) as zero', () => {
    expect(phaseAt(classic, -5)).toEqual({ phase: 'focus', round: 1, left: 25 * 60 });
  });
});

describe('focusSecondsAt', () => {
  it('counts focus only, breaks never count', () => {
    expect(focusSecondsAt(classic, 25 * 60)).toBe(25 * 60);
    expect(focusSecondsAt(classic, 27 * 60)).toBe(25 * 60);
    expect(focusSecondsAt(classic, 31 * 60)).toBe(26 * 60);
  });

  it('is the planned focus once the plan has run out', () => {
    expect(focusSecondsAt(classic, 99999)).toBe(100 * 60);
  });

  it('is zero before the start', () => {
    expect(focusSecondsAt(classic, -1)).toBe(0);
  });
});

describe('skipping a break', () => {
  it('reports the seconds left in a break, zero otherwise', () => {
    expect(breakLeftAt(classic, 26 * 60)).toBe(4 * 60);
    expect(breakLeftAt(classic, 10 * 60)).toBe(0);
    expect(breakLeftAt(classic, totalSeconds(classic))).toBe(0);
  });

  it('moves the rest of the plan earlier when the skipped seconds are added to elapsed', () => {
    const skipped = breakLeftAt(classic, 26 * 60);

    expect(phaseAt(classic, 26 * 60 + skipped)).toEqual({ phase: 'focus', round: 2, left: 25 * 60 });
    expect(focusSecondsAt(classic, 26 * 60 + skipped)).toBe(25 * 60);
  });
});

describe('free sessions', () => {
  it('count every second', () => {
    expect(freeFocusSeconds(90)).toBe(90);
  });

  it('are capped at 8 hours', () => {
    expect(freeFocusSeconds(FREE_CAP_SECONDS + 1000)).toBe(8 * 3600);
  });

  it('never go below zero', () => {
    expect(freeFocusSeconds(-3)).toBe(0);
  });
});

describe('isSavedSession', () => {
  it('needs one full minute of focus', () => {
    expect(isSavedSession(59)).toBe(false);
    expect(isSavedSession(60)).toBe(true);
  });
});

describe('activeSeconds', () => {
  const start = '2026-10-12T09:00:00Z';

  const at = (time: string) => {
    return Date.parse(`2026-10-12T${time}Z`);
  };

  it('is the seconds since the start, less the paused time', () => {
    expect(activeSeconds(start, 0, null, at('09:10:00'))).toBe(600);
    expect(activeSeconds(start, 120, null, at('09:10:00'))).toBe(480);
  });

  it('stops at the pause that is on', () => {
    expect(activeSeconds(start, 0, '2026-10-12T09:04:00Z', at('11:00:00'))).toBe(240);
    expect(activeSeconds(start, 60, '2026-10-12T09:04:00Z', at('11:00:00'))).toBe(180);
  });

  it('is never negative', () => {
    expect(activeSeconds(start, 0, null, at('08:59:58'))).toBe(0);
    expect(activeSeconds(start, 900, null, at('09:10:00'))).toBe(0);
  });
});

describe('pausedTooLong', () => {
  it('is true from 12 hours after the pause began', () => {
    const pausedAt = '2026-10-12T09:00:00Z';

    expect(pausedTooLong(pausedAt, Date.parse('2026-10-12T20:59:59Z'))).toBe(false);
    expect(pausedTooLong(pausedAt, Date.parse('2026-10-12T21:00:00Z'))).toBe(true);
    expect(pausedTooLong(null, Date.parse('2026-10-14T21:00:00Z'))).toBe(false);
  });
});

describe('usesLongBreak', () => {
  it('is false until a break can follow the 4th round, so from 5 rounds up it is true', () => {
    expect(usesLongBreak(3)).toBe(false);
    expect(usesLongBreak(4)).toBe(false);
    expect(usesLongBreak(5)).toBe(true);
    expect(usesLongBreak(12)).toBe(true);
  });

  it('is false for a number that is not there yet', () => {
    expect(usesLongBreak(Number.NaN)).toBe(false);
  });
});
