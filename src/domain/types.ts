import type { CalendarDate, WeekStart } from './dates';

export type Schedule =
  | { kind: 'daily'; effectiveFrom: CalendarDate }
  | { kind: 'weekly_count'; timesPerWeek: number; effectiveFrom: CalendarDate };

/** Everything the domain needs to judge one habit. `archivedOn` is a calendar date in the user's timezone. */
export interface HabitData {
  startDate: CalendarDate;
  archivedOn: CalendarDate | null;
  schedules: Schedule[];
  completions: ReadonlySet<CalendarDate>;
}

export interface Ctx {
  today: CalendarDate;
  weekStartsOn: WeekStart;
}
