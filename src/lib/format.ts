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

/** Short names of weekdays (1 = Monday ... 7 = Sunday), in the order given: "Mon, Wed, Fri". */
export const weekdayNames = (days: Weekday[]): string => {
  return days
    .map(day => {
      return new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(
        new Date(Date.UTC(2024, 0, day)),
      ); // 1 Jan 2024 is a Monday
    })
    .join(', ');
};
