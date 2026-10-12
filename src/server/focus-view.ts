// Pure mapping behind focus sessions. Kept free of `server-only` so it can be unit-tested.
import { toCalendarDate, type CalendarDate } from '@/domain/dates';
import {
  FREE_CAP_SECONDS,
  focusSecondsAt,
  freeFocusSeconds,
  planErrors,
  totalSeconds,
  type FocusPlan,
} from '@/domain/focus';

export interface FocusRow {
  id: string;
  habit_id: string;
  started_at: string;
  ended_at: string | null;
  mode: string;
  plan: unknown;
  skipped_seconds: number;
  focus_seconds: number | null;
}

/** A running session as the browser needs it: the start time and the skipped seconds define the whole timeline. */
export interface FocusHabit {
  name: string;
  icon: string;
  color: string;
}

export interface FocusSession {
  id: string;
  habitId: string;
  habit: FocusHabit;
  mode: 'free' | 'pomodoro';
  plan: FocusPlan | null;
  startedAt: string;
  skippedSeconds: number;
}

export interface FocusState {
  running: FocusSession | null;
  /** The database clock, so the browser can count from the right moment whatever its own clock says. */
  serverNow: string;
  /** The numbers last used on each habit. */
  plans: Record<string, FocusPlan>;
}

export interface FocusTotals {
  totalSeconds: number;
  byHabit: { habitId: string; seconds: number }[];
}

const PLAN_FIELDS = ['focusMin', 'breakMin', 'longBreakMin', 'rounds'] as const;

/** A stored plan, or `null` when it is not a whole, valid one. */
export const parsePlan = (value: unknown): FocusPlan | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const numbers = PLAN_FIELDS.map(field => {
    return record[field];
  });

  if (
    !numbers.every(n => {
      return typeof n === 'number';
    })
  ) {
    return null;
  }

  const [focusMin, breakMin, longBreakMin, rounds] = numbers as number[];
  const plan = { focusMin, breakMin, longBreakMin, rounds };

  return planErrors(plan).length === 0 ? plan : null;
};

export const toSession = (row: FocusRow, habit: FocusHabit): FocusSession => {
  const { id, habit_id, mode, plan, started_at, skipped_seconds } = row;

  return {
    id,
    habitId: habit_id,
    habit,
    mode: mode === 'pomodoro' ? 'pomodoro' : 'free',
    plan: parsePlan(plan),
    startedAt: started_at,
    skippedSeconds: skipped_seconds,
  };
};

export interface Settled {
  endedAt: string;
  focusSeconds: number;
  /** The session had run out (plan finished or free cap reached) before `now`. */
  expired: boolean;
}

/**
 * Closes a session at `now`: its end is `now`, or earlier when the plan (or the 8 hour free cap) had already run out.
 * A pomodoro row whose plan cannot be read is closed like a free one, so it never blocks the person.
 */
export const settle = (row: FocusRow, now: Date): Settled => {
  const { started_at, skipped_seconds, plan: stored } = row;
  const plan = row.mode === 'pomodoro' ? parsePlan(stored) : null;
  const start = new Date(started_at).getTime();
  const length = plan ? Math.max(0, totalSeconds(plan) - skipped_seconds) : FREE_CAP_SECONDS;
  const elapsed = Math.floor((now.getTime() - start) / 1000);
  const seconds = Math.min(Math.max(0, elapsed), length);

  return {
    endedAt: new Date(start + seconds * 1000).toISOString(),
    focusSeconds: plan ? focusSecondsAt(plan, seconds + skipped_seconds) : freeFocusSeconds(seconds),
    expired: elapsed >= length,
  };
};

interface FinishedSession {
  habitId: string;
  startedAt: string;
  focusSeconds: number;
}

/** Focus seconds per habit between two calendar dates, each session counted on the day it started in the person's timezone. */
export const focusByHabit = (
  sessions: FinishedSession[],
  from: CalendarDate,
  to: CalendarDate,
  timeZone: string,
): FocusTotals => {
  const seconds = new Map<string, number>();
  let total = 0;

  for (const session of sessions) {
    const { habitId, startedAt, focusSeconds } = session;
    const day = toCalendarDate(startedAt, timeZone);

    if (day >= from && day <= to) {
      seconds.set(habitId, (seconds.get(habitId) ?? 0) + focusSeconds);
      total += focusSeconds;
    }
  }

  const byHabit = [...seconds.entries()]
    .map(([habitId, secs]) => {
      return { habitId, seconds: secs };
    })
    .sort((a, b) => {
      return b.seconds - a.seconds;
    });

  return { totalSeconds: total, byHabit };
};
