import type { CalendarDate } from '@/domain/dates';

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
