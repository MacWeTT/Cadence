import { addDays, isCalendarDate, weekStart, type CalendarDate, type WeekStart } from './dates';
import type { HabitData, Schedule } from './types';

/** The schedule in effect on `date`: the latest one whose `effectiveFrom` is on or before it. */
export function scheduleOn(schedules: Schedule[], date: CalendarDate): Schedule | undefined {
  let found: Schedule | undefined;
  for (const s of schedules) {
    if (s.effectiveFrom <= date && (!found || s.effectiveFrom > found.effectiveFrom)) found = s;
  }
  return found;
}

/**
 * The schedule that judges `date` for this habit. Undefined before `startDate`. A date on or after
 * `startDate` but before every `effectiveFrom` uses the earliest schedule, so moving `startDate`
 * earlier needs no data rewrite.
 */
export function scheduleFor(h: HabitData, date: CalendarDate): Schedule | undefined {
  if (date < h.startDate || h.schedules.length === 0) return undefined;
  const earliest = h.schedules.reduce((a, b) => (b.effectiveFrom < a.effectiveFrom ? b : a));
  return scheduleOn(h.schedules, date) ?? earliest;
}

export type ScheduleParseResult = { ok: true; value: Schedule } | { ok: false; error: string };

export function parseScheduleInput(input: unknown): ScheduleParseResult {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'Schedule must be an object' };
  const { kind, timesPerWeek, effectiveFrom } = input as Record<string, unknown>;
  if (!isCalendarDate(effectiveFrom)) return { ok: false, error: 'effectiveFrom must be a valid YYYY-MM-DD date' };
  if (kind === 'daily') {
    if (timesPerWeek !== undefined && timesPerWeek !== null)
      return { ok: false, error: 'A daily schedule has no timesPerWeek' };
    return { ok: true, value: { kind, effectiveFrom } };
  }
  if (kind === 'weekly_count') {
    if (!Number.isInteger(timesPerWeek) || (timesPerWeek as number) < 1 || (timesPerWeek as number) > 6) {
      return { ok: false, error: 'timesPerWeek must be a whole number from 1 to 6' };
    }
    return { ok: true, value: { kind, timesPerWeek: timesPerWeek as number, effectiveFrom } };
  }
  return { ok: false, error: 'kind must be "daily" or "weekly_count"' };
}

/** The first day of next week: when a weekly target change or a type switch takes effect. */
export function nextEditDate(today: CalendarDate, weekStartsOn: WeekStart): CalendarDate {
  return addDays(weekStart(today, weekStartsOn), 7);
}
