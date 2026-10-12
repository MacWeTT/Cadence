import { FREE_CAP_SECONDS, focusSecondsAt, freeFocusSeconds, phaseAt, type FocusPhase } from '@/domain/focus';
import type { FocusSession } from '@/server/focus-view';

export interface SessionView {
  /** `free` counts up; the others come from the plan. */
  phase: FocusPhase | 'free';
  round: number;
  rounds: number;
  /** What the big clock shows: seconds left in the phase, or seconds elapsed for a free session. */
  clock: number;
  /** Seconds in the whole phase, for the ring; 0 for a free session. */
  phaseLength: number;
  focusSeconds: number;
  done: boolean;
}

/** h:mm:ss from one hour up, m:ss below. */
export const formatClock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');

  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/** How far the database clock is ahead of the browser clock, so the countdown is right whatever this device says. */
export const offsetFrom = (serverNow: string, browserNow: number): number => {
  return Date.parse(serverNow) - browserNow;
};

export const tabTitle = (clock: number, habit: string): string => {
  return `${formatClock(clock)} · ${habit}`;
};

/** Everything the panel, bar and tab title show, derived from the start time and `now` (server time, in ms). */
export const sessionView = (session: FocusSession, nowMs: number): SessionView => {
  const { plan, startedAt, skippedSeconds } = session;
  const elapsed = Math.max(0, Math.floor((nowMs - Date.parse(startedAt)) / 1000));

  if (!plan) {
    return {
      phase: 'free',
      round: 1,
      rounds: 1,
      clock: freeFocusSeconds(elapsed),
      phaseLength: 0,
      focusSeconds: freeFocusSeconds(elapsed),
      done: elapsed >= FREE_CAP_SECONDS,
    };
  }

  const effective = elapsed + skippedSeconds;
  const { phase, round, left } = phaseAt(plan, effective);
  const { focusMin, breakMin, longBreakMin, rounds } = plan;
  const long = round % 4 === 0;
  const phaseLength = phase === 'focus' ? focusMin * 60 : (long ? longBreakMin : breakMin) * 60;

  return {
    phase,
    round,
    rounds,
    clock: left,
    phaseLength: phase === 'done' ? 0 : phaseLength,
    focusSeconds: focusSecondsAt(plan, effective),
    done: phase === 'done',
  };
};
