// The rules of Circles, in plain TypeScript. The database enforces the same limits and levels (see
// supabase/migrations/*_circles.sql); a test reads that file and checks they agree.

/** How much of a habit a circle sees, from nothing to everything. */
export const LEVELS = ['hidden', 'showed_up', 'done_today', 'streaks', 'everything'] as const;
export type Level = (typeof LEVELS)[number];

/** The levels a share can be stored at: no share at all means hidden. */
export const SHARE_LEVELS = ['showed_up', 'done_today', 'streaks', 'everything'] as const;
export type ShareLevel = (typeof SHARE_LEVELS)[number];

/** How a shared habit is named to friends: its name, only its emoji, or just "a habit". */
export const LABELS = ['name', 'emoji', 'generic'] as const;
export type Label = (typeof LABELS)[number];

export const CIRCLE_LIMITS = { maxMembers: 8, maxCircles: 10, inviteDays: 7, nameMax: 60 } as const;

export const isLevel = (value: unknown): value is Level => {
  return LEVELS.some(level => {
    return level === value;
  });
};

export const isShareLevel = (value: unknown): value is ShareLevel => {
  return SHARE_LEVELS.some(level => {
    return level === value;
  });
};

export const isLabel = (value: unknown): value is Label => {
  return LABELS.some(label => {
    return label === value;
  });
};

export const levelRank = (level: Level): number => {
  return LEVELS.indexOf(level);
};

/** Does `level` give at least as much as `min`? */
export const atLeast = (level: Level, min: Level): boolean => {
  return levelRank(level) >= levelRank(min);
};

/** What a friend may be shown of one habit at a level. There is no field about what was missed, at any level. */
export interface Reveal {
  /** The habit itself (named as the owner chose). */
  habit: boolean;
  /** Whether it is done on the owner's today. */
  done: boolean;
  /** The current streak, and the week's count for a weekly habit. */
  streak: boolean;
  /** The tick history (the heatmap). */
  history: boolean;
}

export const reveal = (level: Level): Reveal => {
  return {
    habit: atLeast(level, 'done_today'),
    done: atLeast(level, 'done_today'),
    streak: atLeast(level, 'streaks'),
    history: level === 'everything',
  };
};

/** What is wrong with a circle's name, or null when it is fine. The name is trimmed first. */
export const circleNameProblem = (name: string): 'required' | 'tooLong' | null => {
  const { length } = name.trim();

  if (length < 1) {
    return 'required';
  }

  return length > CIRCLE_LIMITS.nameMax ? 'tooLong' : null;
};
