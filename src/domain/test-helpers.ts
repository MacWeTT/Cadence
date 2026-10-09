import type { CalendarDate, WeekStart } from './dates';
import type { Ctx, HabitData } from './types';

/** A daily habit starting 2026-10-01 by default. `done` is shorthand for `completions`. */
export function makeHabit(over: Partial<HabitData> & { done?: CalendarDate[] } = {}): HabitData {
  const startDate = over.startDate ?? '2026-10-01';
  return {
    startDate,
    pauses: over.pauses ?? [],
    schedules: over.schedules ?? [{ kind: 'daily', effectiveFrom: startDate }],
    completions: over.completions ?? new Set(over.done ?? []),
  };
}

export function ctx(today: CalendarDate = '2026-10-09', weekStartsOn: WeekStart = 1): Ctx {
  return { today, weekStartsOn };
}
