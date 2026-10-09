/** A calendar date as `YYYY-MM-DD`. Never a timestamp. */
export type CalendarDate = string;
/** First day of the week: 1 = Monday, 7 = Sunday. */
export type WeekStart = 1 | 7;

const DAY_MS = 86_400_000;

const toUtcMs = (d: CalendarDate): number => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
};

const fromUtcMs = (ms: number): CalendarDate => new Date(ms).toISOString().slice(0, 10);

/** True for a real calendar date written as `YYYY-MM-DD` (rejects `2026-13-40` and `2026-02-30`). */
export function isCalendarDate(value: unknown): value is CalendarDate {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    fromUtcMs(toUtcMs(value)) === value
  );
}

/** Today's date in the given IANA timezone. Throws RangeError for an invalid timezone. */
export function todayIn(timeZone: string, now: Date = new Date()): CalendarDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** The calendar date of an instant (an ISO timestamp or a Date) in the given IANA timezone. */
export function toCalendarDate(ts: string | Date, timeZone: string): CalendarDate {
  return todayIn(timeZone, new Date(ts));
}

export function addDays(d: CalendarDate, n: number): CalendarDate {
  return fromUtcMs(toUtcMs(d) + n * DAY_MS);
}

/** Whole calendar days from `a` to `b` (b minus a). */
export function diffDays(a: CalendarDate, b: CalendarDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

export function weekStart(d: CalendarDate, weekStartsOn: WeekStart): CalendarDate {
  const dow = new Date(toUtcMs(d)).getUTCDay(); // 0 = Sunday
  const offset = weekStartsOn === 1 ? (dow + 6) % 7 : dow;
  return addDays(d, -offset);
}

export function weekEnd(d: CalendarDate, weekStartsOn: WeekStart): CalendarDate {
  return addDays(weekStart(d, weekStartsOn), 6);
}
