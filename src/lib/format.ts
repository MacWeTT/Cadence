import type { CalendarDate } from '@/domain/dates';
import type { Weekday } from '@/domain/types';

/**
 * A calendar date for people, e.g. "12 Oct 2026". Always formatted through Intl, never by hand.
 * shortcut: fixed to en-GB, switch to the active locale when a second language arrives.
 */
export const formatCalendarDate = (
  date: CalendarDate,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string => {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
};

/** The name of a weekday (1 = Monday ... 7 = Sunday): "Mon" or "Monday". */
export const weekdayLabel = (day: number, style: 'short' | 'long' = 'short'): string => {
  // 1 Jan 2024 is a Monday
  return new Intl.DateTimeFormat('en-GB', { weekday: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, day)));
};

/** Short names of weekdays, in the order given: "Mon, Wed, Fri". */
export const weekdayNames = (days: Weekday[]): string => {
  return days
    .map(day => {
      return weekdayLabel(day);
    })
    .join(', ');
};
