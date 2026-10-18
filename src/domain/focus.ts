export interface FocusPlan {
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  rounds: number;
}

export type FocusPhase = 'focus' | 'break' | 'done';

export interface PhaseState {
  phase: FocusPhase;
  round: number;
  left: number;
}

export type PlanField = keyof FocusPlan;

interface Part {
  phase: 'focus' | 'break';
  round: number;
  seconds: number;
}

export const PRESETS = {
  classic: { focusMin: 25, breakMin: 5, longBreakMin: 15, rounds: 4 },
  deep: { focusMin: 50, breakMin: 10, longBreakMin: 30, rounds: 3 },
  short: { focusMin: 15, breakMin: 3, longBreakMin: 10, rounds: 4 },
} satisfies Record<string, FocusPlan>;

export const FREE_CAP_SECONDS = 8 * 3600;
/** A session left paused this long is closed by the server (with the time up to the pause). */
export const PAUSE_LIMIT_SECONDS = 12 * 3600;
export const MIN_SAVED_SECONDS = 60;

/** The long break comes after every 4th round; the number is not editable. */
const LONG_BREAK_EVERY = 4;

const LIMITS: Record<PlanField, [number, number]> = {
  focusMin: [1, 180],
  breakMin: [1, 60],
  longBreakMin: [1, 60],
  rounds: [1, 12],
};

/** The long break only comes when a round follows the 4th, so a plan of 4 rounds or fewer never has one. */
export const usesLongBreak = (rounds: number): boolean => {
  return rounds > LONG_BREAK_EVERY;
};

/** The fields of a plan that are not whole numbers inside their limits. */
export const planErrors = (plan: FocusPlan): PlanField[] => {
  const fields = Object.keys(LIMITS) as PlanField[];

  return fields.filter(field => {
    const [min, max] = LIMITS[field];
    const value = plan[field];

    return !Number.isInteger(value) || value < min || value > max;
  });
};

/** The phases of a plan in order. Nothing follows the last round. */
const timeline = (plan: FocusPlan): Part[] => {
  const { focusMin, breakMin, longBreakMin, rounds } = plan;
  const parts: Part[] = [];

  for (let round = 1; round <= rounds; round++) {
    parts.push({ phase: 'focus', round, seconds: focusMin * 60 });

    if (round < rounds) {
      const long = round % LONG_BREAK_EVERY === 0;

      parts.push({ phase: 'break', round, seconds: (long ? longBreakMin : breakMin) * 60 });
    }
  }

  return parts;
};

export const totalSeconds = (plan: FocusPlan): number => {
  return timeline(plan).reduce((sum, part) => {
    return sum + part.seconds;
  }, 0);
};

/** Where a plan stands `elapsed` seconds after it started (skipped break time already added to `elapsed`). */
export const phaseAt = (plan: FocusPlan, elapsed: number): PhaseState => {
  let rest = Math.max(0, elapsed);

  for (const part of timeline(plan)) {
    const { phase, round, seconds } = part;

    if (rest < seconds) {
      return { phase, round, left: seconds - rest };
    }

    rest -= seconds;
  }

  return { phase: 'done', round: plan.rounds, left: 0 };
};

/** Seconds spent in focus phases only; breaks never count, and the plan's own length is the ceiling. */
export const focusSecondsAt = (plan: FocusPlan, elapsed: number): number => {
  let rest = Math.max(0, elapsed);
  let focused = 0;

  for (const part of timeline(plan)) {
    const { phase, seconds } = part;
    const used = Math.min(rest, seconds);

    if (phase === 'focus') {
      focused += used;
    }

    rest -= used;
  }

  return focused;
};

/** Seconds left in the break running now (0 outside a break): what "Skip break" adds to the skipped total. */
export const breakLeftAt = (plan: FocusPlan, elapsed: number): number => {
  const { phase, left } = phaseAt(plan, elapsed);

  return phase === 'break' ? left : 0;
};

/**
 * Seconds a session has been running at `nowMs`, leaving out paused time: the pause that is on stops the count at the
 * moment it began, and earlier pauses are already summed in `pausedSeconds`.
 */
export const activeSeconds = (
  startedAt: string,
  pausedSeconds: number,
  pausedAt: string | null,
  nowMs: number,
): number => {
  const until = pausedAt ? Date.parse(pausedAt) : nowMs;

  return Math.max(0, Math.floor((until - Date.parse(startedAt)) / 1000) - pausedSeconds);
};

export const pausedTooLong = (pausedAt: string | null, nowMs: number): boolean => {
  return pausedAt !== null && nowMs - Date.parse(pausedAt) >= PAUSE_LIMIT_SECONDS * 1000;
};

export const freeFocusSeconds = (elapsed: number): number => {
  return Math.min(Math.max(0, elapsed), FREE_CAP_SECONDS);
};

export const isSavedSession = (focusSeconds: number): boolean => {
  return focusSeconds >= MIN_SAVED_SECONDS;
};
