import { describe, expect, it } from 'vitest';
import { PRESETS } from '@/domain/focus';
import { formatClock, offsetFrom, sessionView, tabTitle } from '@/lib/focus-clock';
import type { FocusSession } from '@/server/focus-view';

const START = Date.parse('2026-10-12T09:00:00Z');

const session = (over: Partial<FocusSession> = {}): FocusSession => {
  return {
    id: 's1',
    habitId: 'h1',
    habit: { name: 'Read', icon: 'book', color: 'moss' },
    mode: 'free',
    plan: null,
    startedAt: '2026-10-12T09:00:00Z',
    skippedSeconds: 0,
    soundId: null,
    ...over,
  };
};

const pomodoro = (over: Partial<FocusSession> = {}) => {
  return session({ mode: 'pomodoro', plan: PRESETS.classic, ...over });
};

describe('formatClock', () => {
  it('shows minutes and seconds', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(25 * 60)).toBe('25:00');
  });

  it('adds hours from one hour up', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(2 * 3600 + 5 * 60 + 9)).toBe('2:05:09');
  });

  it('never shows a negative time', () => {
    expect(formatClock(-4)).toBe('0:00');
  });
});

describe('offsetFrom', () => {
  it('is how far the server clock is ahead of the browser clock', () => {
    expect(offsetFrom('2026-10-12T09:00:10Z', Date.parse('2026-10-12T09:00:00Z'))).toBe(10_000);
    expect(offsetFrom('2026-10-12T09:00:00Z', Date.parse('2026-10-12T09:00:05Z'))).toBe(-5_000);
  });
});

describe('sessionView, free', () => {
  it('counts up and is never done before the cap', () => {
    const view = sessionView(session(), START + 90_000);

    expect(view).toMatchObject({ clock: 90, focusSeconds: 90, phase: 'free', done: false });
  });

  it('is done at the 8 hour cap', () => {
    expect(sessionView(session(), START + 9 * 3600 * 1000).done).toBe(true);
  });
});

describe('sessionView, pomodoro', () => {
  it('counts the focus phase down', () => {
    const view = sessionView(pomodoro(), START + 60_000);

    expect(view).toMatchObject({ phase: 'focus', round: 1, rounds: 4, clock: 24 * 60, done: false });
  });

  it('moves to the break and names the next round', () => {
    const view = sessionView(pomodoro(), START + 26 * 60_000);

    expect(view).toMatchObject({ phase: 'break', round: 1, clock: 4 * 60, focusSeconds: 25 * 60 });
  });

  it('adds skipped seconds so the break is gone', () => {
    const view = sessionView(pomodoro({ skippedSeconds: 4 * 60 }), START + 26 * 60_000);

    expect(view).toMatchObject({ phase: 'focus', round: 2 });
  });

  it('is done when the plan has run out', () => {
    expect(sessionView(pomodoro(), START + 3 * 3600 * 1000)).toMatchObject({ phase: 'done', done: true, clock: 0 });
  });

  it('does not go negative when the server clock is slightly behind the start', () => {
    expect(sessionView(pomodoro(), START - 2000)).toMatchObject({ phase: 'focus', clock: 25 * 60 });
  });
});

describe('tabTitle', () => {
  it('puts the time before the habit', () => {
    expect(tabTitle(16 * 60 + 42, 'Read')).toBe('16:42 · Read');
  });
});
