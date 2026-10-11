import type { CalendarDate, WeekStart } from '@/domain/dates';

/** A day of the week: 1 = Monday ... 7 = Sunday, whatever day the week starts on. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Schedule =
  | { kind: 'daily'; effectiveFrom: CalendarDate }
  /** Expected only on these days (one to six, sorted). */
  | { kind: 'weekdays'; days: Weekday[]; effectiveFrom: CalendarDate }
  | { kind: 'weekly_count'; timesPerWeek: number; effectiveFrom: CalendarDate }
  /** No expectations: no streak, no rate, only a count of ticks. */
  | { kind: 'optional'; effectiveFrom: CalendarDate };

/** A stretch of days a habit was archived. `to` is exclusive; `null` means it is still archived. */
export interface Pause {
  from: CalendarDate;
  to: CalendarDate | null;
}

/** Everything the domain needs to judge one habit. Dates are calendar dates in the user's timezone. */
export interface HabitData {
  startDate: CalendarDate;
  pauses: Pause[];
  schedules: Schedule[];
  completions: ReadonlySet<CalendarDate>;
}

export interface Ctx {
  today: CalendarDate;
  weekStartsOn: WeekStart;
}
