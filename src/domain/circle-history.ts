import { addDays, weekStart, type CalendarDate, type WeekStart } from '@/domain/dates';

/** One day of a friend's shared history. There is no "missed": a day that was not ticked is only not ticked. */
export interface HistoryDay {
  date: CalendarDate;
  done: boolean;
  /** After the owner's today, so it is never read as anything. */
  future: boolean;
}

/** The last `count` weeks up to the one holding `today`, oldest first, each week from the owner's week start. */
export const historyWeeks = (
  ticks: readonly CalendarDate[],
  today: CalendarDate,
  weekStartsOn: WeekStart,
  count: number,
): HistoryDay[][] => {
  const ticked = new Set(ticks);
  const first = addDays(weekStart(today, weekStartsOn), -7 * (count - 1));

  return Array.from({ length: count }, (_, week) => {
    return Array.from({ length: 7 }, (_, day) => {
      const date = addDays(first, week * 7 + day);

      return { date, done: ticked.has(date), future: date > today };
    });
  });
};
