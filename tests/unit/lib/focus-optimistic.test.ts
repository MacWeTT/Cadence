import { describe, expect, it } from 'vitest';
import { PRESETS } from '@/domain/focus';
import { withoutRunning } from '@/lib/focus-optimistic';
import type { FocusState } from '@/server/focus-view';

const state: FocusState = {
  running: {
    id: 's1',
    habitId: 'h1',
    habit: { name: 'Read', icon: 'book', color: 'moss' },
    mode: 'free',
    plan: null,
    startedAt: '2026-10-18T09:00:00Z',
    skippedSeconds: 0,
    pausedAt: null,
    pausedSeconds: 0,
    soundId: null,
  },
  serverNow: '2026-10-18T09:10:00Z',
  plans: { h1: PRESETS.classic },
  sounds: { h1: 'bell' },
};

describe('withoutRunning', () => {
  it('stops the session and keeps everything else', () => {
    expect(withoutRunning(state)).toEqual({ ...state, running: null });
  });

  it('does not change the state it was given', () => {
    withoutRunning(state);

    expect(state.running).not.toBeNull();
  });

  it('leaves an empty cache alone', () => {
    expect(withoutRunning(undefined)).toBeUndefined();
  });
});
