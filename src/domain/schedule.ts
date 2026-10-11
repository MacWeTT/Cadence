import { addDays, isCalendarDate, weekStart, weekdayOf, type CalendarDate, type WeekStart } from '@/domain/dates';
import type { HabitData, Schedule, Weekday } from '@/domain/types';

/** The schedule in effect on `date`: the latest one whose `effectiveFrom` is on or before it. */
export const scheduleOn = (schedules: Schedule[], date: CalendarDate): Schedule | undefined => {
  let found: Schedule | undefined;

  for (const s of schedules) {
    const { effectiveFrom } = s;

    if (effectiveFrom <= date && (!found || effectiveFrom > found.effectiveFrom)) {
      found = s;
    }
  }

  return found;
};

/**
 * The schedule that judges `date` for this habit. Undefined before `startDate`. A date on or after
 * `startDate` but before every `effectiveFrom` uses the earliest schedule, so moving `startDate`
 * earlier needs no data rewrite.
 */
export const scheduleFor = (h: HabitData, date: CalendarDate): Schedule | undefined => {
  const { startDate, schedules } = h;

  if (date < startDate || schedules.length === 0) {
    return undefined;
  }

  const earliest = schedules.reduce((a, b) => {
    return b.effectiveFrom < a.effectiveFrom ? b : a;
  });

  return scheduleOn(schedules, date) ?? earliest;
};

/** True on a day a fixed-weekday habit does not expect: not one of its days. Any other kind of schedule has none. */
export const isOffDay = (h: HabitData, date: CalendarDate): boolean => {
  const schedule = scheduleFor(h, date);

  return schedule?.kind === 'weekdays' && !schedule.days.includes(weekdayOf(date) as Weekday);
};

/** One to six different weekdays, each 1 (Monday) to 7 (Sunday): all seven would just be daily. */
export const isWeekdaySet = (days: unknown): days is Weekday[] => {
  if (!Array.isArray(days)) {
    return false;
  }

  const { length } = days;

  return (
    length >= 1 &&
    length <= 6 &&
    new Set(days).size === length &&
    days.every(day => {
      return Number.isInteger(day) && day >= 1 && day <= 7;
    })
  );
};

export type ScheduleParseResult = { ok: true; value: Schedule } | { ok: false; error: string };

export const parseScheduleInput = (input: unknown): ScheduleParseResult => {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'Schedule must be an object' };
  }

  const { kind, timesPerWeek, days, effectiveFrom } = input as Record<string, unknown>;

  if (!isCalendarDate(effectiveFrom)) {
    return { ok: false, error: 'effectiveFrom must be a valid YYYY-MM-DD date' };
  }

  if (kind === 'daily' || kind === 'optional') {
    if ((timesPerWeek !== undefined && timesPerWeek !== null) || (days !== undefined && days !== null)) {
      return { ok: false, error: `A ${kind} schedule has no timesPerWeek or days` };
    }

    return { ok: true, value: { kind, effectiveFrom } };
  }

  if (kind === 'weekdays') {
    if (!isWeekdaySet(days)) {
      return { ok: false, error: 'days must be one to six different weekdays, from 1 (Monday) to 7 (Sunday)' };
    }

    return { ok: true, value: { kind, days: [...days].sort(), effectiveFrom } };
  }

  if (kind === 'weekly_count') {
    if (!Number.isInteger(timesPerWeek) || (timesPerWeek as number) < 1 || (timesPerWeek as number) > 6) {
      return { ok: false, error: 'timesPerWeek must be a whole number from 1 to 6' };
    }

    return { ok: true, value: { kind, timesPerWeek: timesPerWeek as number, effectiveFrom } };
  }

  return { ok: false, error: 'kind must be "daily", "weekdays", "weekly_count" or "optional"' };
};

/** The first day of next week: when a weekly target change or a type switch takes effect. */
export const nextEditDate = (today: CalendarDate, weekStartsOn: WeekStart): CalendarDate => {
  return addDays(weekStart(today, weekStartsOn), 7);
};
