import { addDays, type CalendarDate } from './dates';
import { scheduleFor } from './schedule';
import type { Ctx, HabitData } from './types';

export type DayStatus = 'done' | 'missed' | 'pending' | 'inactive';

export interface WeekStatus {
  status: 'met' | 'missed' | 'in_progress' | 'excluded' | 'inactive';
  done: number;
  target: number;
}

/** Status of one day for a habit on a daily schedule. Anything else is `inactive`. */
export function dayStatus(h: HabitData, date: CalendarDate, ctx: Ctx): DayStatus {
  const schedule = scheduleFor(h, date);
  if (schedule?.kind !== 'daily') return 'inactive';
  if (date > ctx.today || (h.archivedOn !== null && date > h.archivedOn)) return 'inactive';
  if (h.completions.has(date)) return 'done';
  return date === ctx.today ? 'pending' : 'missed';
}

/**
 * Status of the week starting `weekStartDate` for a habit on a weekly schedule. The week is judged by
 * the schedule in effect when it started (or when the habit started, if later). `excluded` is the partial
 * first week: it is excluded from streaks and rates, but `done` and `target` are still filled in.
 */
export function weekStatus(h: HabitData, weekStartDate: CalendarDate, ctx: Ctx): WeekStatus {
  const inactive: WeekStatus = { status: 'inactive', done: 0, target: 0 };
  const end = addDays(weekStartDate, 6);
  if (end < h.startDate || weekStartDate > ctx.today) return inactive;

  const from = weekStartDate < h.startDate ? h.startDate : weekStartDate;
  const first = scheduleFor(h, from);
  const last = scheduleFor(h, end);
  const schedule = first?.kind === 'weekly_count' ? first : last?.kind === 'weekly_count' ? last : undefined;
  if (schedule?.kind !== 'weekly_count') return inactive;
  if (h.archivedOn !== null && end > h.archivedOn) return inactive;
  // A schedule kind that changes mid-week (possible once the week start is changed) leaves a partial week.
  const straddlesTypeChange = first?.kind !== last?.kind;

  let done = 0;
  for (let d = from; d <= end && d <= ctx.today; d = addDays(d, 1)) {
    if (h.completions.has(d)) done++;
  }
  const target = schedule.timesPerWeek;

  if (weekStartDate < h.startDate || straddlesTypeChange) return { status: 'excluded', done, target };
  if (done >= target) return { status: 'met', done, target };
  return { status: end >= ctx.today ? 'in_progress' : 'missed', done, target };
}
