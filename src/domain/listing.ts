import { addDays, weekEnd, weekStart, type CalendarDate } from './dates';
import { scheduleFor } from './schedule';
import { isPaused } from './status';
import type { Ctx, HabitData } from './types';

/**
 * Whether the Today page lists this habit on `date`: it has started, has a schedule in effect, is not archived
 * right now, and is not paused on that day (unless it was ticked then).
 */
export function isListedOn(h: HabitData, date: CalendarDate, ctx: Ctx): boolean {
  if (date > ctx.today || date < h.startDate || !scheduleFor(h, date)) return false;
  if (h.pauses.some((p) => p.to === null)) return false;
  return !isPaused(h, date) || h.completions.has(date);
}

export interface WeekProgress {
  done: number;
  target: number;
  goalMet: boolean;
}

/** Ticks so far in the week containing `date` for a weekly habit, or null for any other schedule. Bonus ticks keep counting. */
export function weekProgress(h: HabitData, date: CalendarDate, ctx: Ctx): WeekProgress | null {
  const start = weekStart(date, ctx.weekStartsOn);
  const from = start < h.startDate ? h.startDate : start;
  const schedule = scheduleFor(h, from);
  if (schedule?.kind !== 'weekly_count') return null;

  const end = weekEnd(date, ctx.weekStartsOn);
  const last = end < ctx.today ? end : ctx.today;
  let done = 0;
  for (let d = from; d <= last; d = addDays(d, 1)) if (h.completions.has(d)) done++;
  return { done, target: schedule.timesPerWeek, goalMet: done >= schedule.timesPerWeek };
}
