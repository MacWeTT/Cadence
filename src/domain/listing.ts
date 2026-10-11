import { addDays, weekEnd, weekStart, type CalendarDate } from '@/domain/dates';
import { scheduleFor } from '@/domain/schedule';
import { isPaused } from '@/domain/status';
import type { Ctx, HabitData } from '@/domain/types';

/**
 * Whether the Today page lists this habit on `date`: it has started, has a schedule in effect, is not archived
 * right now, and is not paused on that day (unless it was ticked then).
 */
export const isListedOn = (h: HabitData, date: CalendarDate, ctx: Ctx): boolean => {
  const { today } = ctx;
  const { startDate, pauses, completions } = h;

  if (date > today || date < startDate || !scheduleFor(h, date)) {
    return false;
  }

  if (
    pauses.some(({ to }) => {
      return to === null;
    })
  ) {
    return false;
  }

  return !isPaused(h, date) || completions.has(date);
};

export interface WeekProgress {
  done: number;
  target: number;
  goalMet: boolean;
}

/** Ticks so far in the week containing `date` for a weekly habit, or null for any other schedule. Bonus ticks keep counting. */
export const weekProgress = (h: HabitData, date: CalendarDate, ctx: Ctx): WeekProgress | null => {
  const { today, weekStartsOn } = ctx;
  const { startDate, completions } = h;
  const start = weekStart(date, weekStartsOn);
  const from = start < startDate ? startDate : start;
  const schedule = scheduleFor(h, from);

  if (schedule?.kind !== 'weekly_count') {
    return null;
  }

  const { timesPerWeek } = schedule;
  const end = weekEnd(date, weekStartsOn);
  const last = end < today ? end : today;
  let done = 0;

  for (let d = from; d <= last; d = addDays(d, 1)) {
    if (completions.has(d)) {
      done++;
    }
  }

  return { done, target: timesPerWeek, goalMet: done >= timesPerWeek };
};
