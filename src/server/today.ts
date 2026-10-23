import 'server-only';
import type { CalendarDate } from '@/domain/dates';
import { loadHabitData } from '@/server/habit-data';
import { toTodayData } from '@/server/page-data';
import type { TodayView } from '@/server/today-view';

export interface TodayData {
  view: TodayView;
  /** The viewed day (from the URL, clamped to today). */
  date: CalendarDate;
  today: CalendarDate;
  /** The earliest day with anything to show; the previous-day arrow stops here. */
  earliest: CalendarDate;
}

export const getTodayView = async (dateParam: string | string[] | undefined): Promise<TodayData> => {
  return toTodayData(await loadHabitData(), dateParam);
};
