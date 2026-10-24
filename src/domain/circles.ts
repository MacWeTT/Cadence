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

/** The reactions on a friend's day. The heart carries U+FE0F, the emoji variation selector, as the database's check does. */
export const REACTIONS = ['\u{1F44F}', '\u{1F525}', '\u{1F4AA}', '\u2764\uFE0F'] as const;
export type Reaction = (typeof REACTIONS)[number];

/** A reaction can be given to a friend's today and the days before it, this many back. */
export const REACTION_DAYS = 6;

/** The colours a person can give a circle: the same as the habit colours (a test checks it). */
export const CIRCLE_COLORS = ['moss', 'clay', 'ochre', 'rose', 'plum', 'teal', 'sky', 'slate'] as const;
export type CircleColor = (typeof CIRCLE_COLORS)[number];

/** A circle is a group of two to eight people, or a pair: two people who chose each other. */
export type CircleKind = 'group' | 'pair';

export const CIRCLE_LIMITS = { maxMembers: 8, pairMembers: 2, maxCircles: 10, inviteDays: 7, nameMax: 60 } as const;

/** How many days back a partner can be shown off days (see `missedDays`). */
export const MISS_DAYS = 14;

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

export const isReaction = (value: unknown): value is Reaction => {
  return REACTIONS.some(reaction => {
    return reaction === value;
  });
};

export const isCircleColor = (value: unknown): value is CircleColor => {
  return CIRCLE_COLORS.some(color => {
    return color === value;
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

/**
 * Closer is on only when both people of a pair have turned it on. One person waiting, or any other number of people,
 * is never closer: it is a pair thing, and it needs both.
 */
export const closerActive = (members: readonly { closer: boolean }[]): boolean => {
  return (
    members.length === 2 &&
    members.every(({ closer }) => {
      return closer;
    })
  );
};

/** What is wrong with a circle's name, or null when it is fine. The name is trimmed first. */
export const circleNameProblem = (name: string): 'required' | 'tooLong' | null => {
  const { length } = name.trim();

  if (length < 1) {
    return 'required';
  }

  return length > CIRCLE_LIMITS.nameMax ? 'tooLong' : null;
};
