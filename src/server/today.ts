import 'server-only';
import type { CalendarDate } from '@/domain/dates';
import { loadHabitData } from '@/server/habit-data';
import { buildTodayView, earliestDate, parseDateParam, type TodayView } from '@/server/today-view';

export interface TodayData {
  view: TodayView;
  /** The viewed day (from the URL, clamped to today). */
  date: CalendarDate;
  today: CalendarDate;
  /** The earliest day with anything to show; the previous-day arrow stops here. */
  earliest: CalendarDate;
}

export const getTodayView = async (dateParam: string | string[] | undefined): Promise<TodayData> => {
  const { entries, ctx } = await loadHabitData();
  const { today } = ctx;
  const date = parseDateParam(dateParam, today);

  if (entries.length === 0) {
    return { view: { todo: [], done: [], strip: [], hasHabits: false }, date, today, earliest: today };
  }

  return {
    view: buildTodayView(entries, date, ctx),
    date,
    today,
    earliest: earliestDate(entries, today),
  };
};
