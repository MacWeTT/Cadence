export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export interface GreetingContext {
  /** Local hour, 0-23. */
  hour: number;
  /** 0 = Sunday ... 6 = Saturday. */
  weekday: number;
  /** Habits are listed today and every one is ticked. */
  allDone: boolean;
  /** Habits are listed today and none is ticked. */
  noneDone: boolean;
  /** The raw profile display name. */
  name: string | null;
}

export interface Greeting {
  id: string;
  text: string;
}

// Whole sentences with a {name} placeholder, never assembled from pieces, so they can be translated as they are.
const BY_DAY_PART: Record<DayPart, Greeting[]> = {
  morning: [
    { id: 'm1', text: 'Good morning, {name}' },
    { id: 'm2', text: 'Morning, {name}. Ready when you are.' },
    { id: 'm3', text: 'Rise and tick, {name}.' },
  ],
  afternoon: [
    { id: 'a1', text: 'Good afternoon, {name}' },
    { id: 'a2', text: "Afternoon, {name}. How's the day going?" },
  ],
  evening: [
    { id: 'e1', text: 'Good evening, {name}' },
    { id: 'e2', text: "Evening, {name}. Let's wrap up well." },
  ],
  night: [
    { id: 'n1', text: 'Still up, {name}?' },
    { id: 'n2', text: 'Late one, {name}. One more tick?' },
  ],
};

const BY_WEEKDAY: Record<number, Greeting> = {
  1: { id: 'w1', text: 'Fresh week, {name}' },
  5: { id: 'w5', text: 'Happy Friday, {name}' },
  0: { id: 'w0', text: 'Slow Sunday, {name}' },
};

const ALL_DONE: Greeting[] = [
  { id: 'd1', text: 'All done, {name}. Go enjoy it.' },
  { id: 'd2', text: 'Clean sweep, {name}.' },
];

const FRESH_PAGE: Greeting = { id: 'z1', text: 'Fresh page, {name}. One tick gets you moving.' };

export const dayPart = (hour: number): DayPart => {
  if (hour >= 5 && hour < 12) {
    return 'morning';
  }

  if (hour >= 12 && hour < 18) {
    return 'afternoon';
  }

  if (hour >= 18 && hour < 22) {
    return 'evening';
  }

  return 'night';
};

/** The first word of the display name, or "friend" when there is none. */
export const firstName = (name: string | null): string => {
  return name?.trim().split(/\s+/)[0] || 'friend';
};

/** The lines that suit this moment. */
const poolFor = (ctx: GreetingContext): Greeting[] => {
  return ctx.allDone
    ? ALL_DONE
    : [
        ...BY_DAY_PART[dayPart(ctx.hour)],
        ...(BY_WEEKDAY[ctx.weekday] ? [BY_WEEKDAY[ctx.weekday]] : []),
        ...(ctx.noneDone && ctx.hour >= 12 ? [FRESH_PAGE] : []),
      ];
};

/** `random` returns a number in [0, 1); it is injected so the choice can be tested. `lastId` is never repeated. */
export const pickGreeting = (ctx: GreetingContext, random: () => number, lastId?: string | null): Greeting => {
  let pool = poolFor(ctx);

  if (pool.length > 1) {
    pool = pool.filter(g => {
      return g.id !== lastId;
    });
  }

  const picked = pool[Math.floor(random() * pool.length)];

  return {
    id: picked.id,
    text: picked.text.replace('{name}', () => {
      return firstName(ctx.name);
    }),
  };
};

const STORAGE_KEY = 'cadence:greeting';

/**
 * The greeting for this visit: the stored line is kept for as long as it still suits the moment (so ticking or coming
 * back to Home does not reshuffle it), and a new one is never the same line as the previous one. `storage` is sessionStorage in the
 * browser; any failure to use it (private mode, blocked, junk) just means a fresh pick.
 */
export const chooseGreeting = (
  ctx: GreetingContext,
  random: () => number,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
): Greeting => {
  let stored: { id?: string } = {};

  try {
    stored = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    // unreadable storage: pick fresh
  }

  // "Fresh page" is kept after the first tick: ticking must not reshuffle the greeting.
  const kept = poolFor({ ...ctx, noneDone: true }).find(g => {
    return g.id === stored.id;
  });
  const greeting = kept
    ? {
        id: kept.id,
        text: kept.text.replace('{name}', () => {
          return firstName(ctx.name);
        }),
      }
    : pickGreeting(ctx, random, stored.id);

  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ id: greeting.id }));
  } catch {
    // unwritable storage: the greeting just won't stick
  }

  return greeting;
};
