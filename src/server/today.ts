import 'server-only';
import type { CalendarDate } from '@/domain/dates';
import { loadHabitData } from './habit-data';
import { buildTodayView, earliestDate, parseDateParam, type TodayView } from './today-view';

export interface TodayData {
  view: TodayView;
  /** The viewed day (from the URL, clamped to today). */
  date: CalendarDate;
  today: CalendarDate;
  /** The earliest day with anything to show; the previous-day arrow stops here. */
  earliest: CalendarDate;
}

export async function getTodayView(dateParam: string | string[] | undefined): Promise<TodayData> {
  const { entries, ctx } = await loadHabitData();
  const date = parseDateParam(dateParam, ctx.today);
  if (entries.length === 0) return { view: { todo: [], done: [], strip: [], hasHabits: false }, date, today: ctx.today, earliest: ctx.today };
  return { view: buildTodayView(entries, date, ctx), date, today: ctx.today, earliest: earliestDate(entries, ctx.today) };
}
