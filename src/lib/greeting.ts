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

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/** The first word of the display name, or "friend" when there is none. */
export function firstName(name: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'friend';
}

/** `random` returns a number in [0, 1); it is injected so the choice can be tested. `lastId` is never repeated. */
export function pickGreeting(ctx: GreetingContext, random: () => number, lastId?: string | null): Greeting {
  let pool = ctx.allDone
    ? ALL_DONE
    : [
        ...BY_DAY_PART[dayPart(ctx.hour)],
        ...(BY_WEEKDAY[ctx.weekday] ? [BY_WEEKDAY[ctx.weekday]] : []),
        ...(ctx.noneDone && ctx.hour >= 12 ? [FRESH_PAGE] : []),
      ];
  if (pool.length > 1) pool = pool.filter((g) => g.id !== lastId);
  const picked = pool[Math.floor(random() * pool.length)];
  return { id: picked.id, text: picked.text.replace('{name}', firstName(ctx.name)) };
}
