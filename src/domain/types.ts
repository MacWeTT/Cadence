import type { CalendarDate, WeekStart } from './dates';

export type Schedule =
  | { kind: 'daily'; effectiveFrom: CalendarDate }
  | { kind: 'weekly_count'; timesPerWeek: number; effectiveFrom: CalendarDate };

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
