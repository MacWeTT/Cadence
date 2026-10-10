import { msg, type MessageKey, type Msg } from './message';

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
  /** Which line, so it can be remembered and not repeated. */
  id: string;
  message: Msg;
}

// The lines themselves live in locales/en/greeting.json (`greeting.lines.<id>`); these tables only say when each applies.
const BY_DAY_PART: Record<DayPart, string[]> = {
  morning: ['m1', 'm2', 'm3'],
  afternoon: ['a1', 'a2'],
  evening: ['e1', 'e2'],
  night: ['n1', 'n2'],
};

const BY_WEEKDAY: Record<number, string> = { 1: 'w1', 5: 'w5', 0: 'w0' };

const ALL_DONE = ['d1', 'd2'];

const FRESH_PAGE = 'z1';

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

/** The first word of the display name, or `null` when there is none. */
export const firstName = (name: string | null): string | null => {
  return name?.trim().split(/\s+/)[0] || null;
};

const toGreeting = (id: string, name: string | null): Greeting => {
  return {
    id,
    message: msg(`greeting.lines.${id}` as MessageKey, { name: firstName(name) ?? msg('greeting.friend') }),
  };
};

/** The lines that suit this moment. */
const poolFor = (ctx: GreetingContext): string[] => {
  if (ctx.allDone) {
    return ALL_DONE;
  }

  return [
    ...BY_DAY_PART[dayPart(ctx.hour)],
    ...(BY_WEEKDAY[ctx.weekday] ? [BY_WEEKDAY[ctx.weekday]] : []),
    ...(ctx.noneDone && ctx.hour >= 12 ? [FRESH_PAGE] : []),
  ];
};

/** `random` returns a number in [0, 1); it is injected so the choice can be tested. `lastId` is never repeated. */
export const pickGreeting = (ctx: GreetingContext, random: () => number, lastId?: string | null): Greeting => {
  let pool = poolFor(ctx);

  if (pool.length > 1) {
    pool = pool.filter(id => {
      return id !== lastId;
    });
  }

  return toGreeting(pool[Math.floor(random() * pool.length)], ctx.name);
};

const STORAGE_KEY = 'cadence:greeting';

/**
 * The greeting for this visit: the stored line is kept for as long as it still suits the moment (so ticking or coming
 * back to Home does not reshuffle it), and a new one is never the same line as the previous one. `storage` is
 * sessionStorage in the browser; any failure to use it (private mode, blocked, junk) just means a fresh pick.
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
  const keep = poolFor({ ...ctx, noneDone: true }).find(id => {
    return id === stored.id;
  });
  const greeting = keep ? toGreeting(keep, ctx.name) : pickGreeting(ctx, random, stored.id);

  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ id: greeting.id }));
  } catch {
    // unwritable storage: the greeting just won't stick
  }

  return greeting;
};
