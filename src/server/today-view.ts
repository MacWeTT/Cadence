// Pure mapping from database rows to what the Today page shows. Kept free of `server-only` so it can be unit-tested.
import { isCalendarDate, type CalendarDate } from '@/domain/dates';
import { isListedOn, weekProgress, type WeekProgress } from '@/domain/listing';
import { currentStreak, type Streak } from '@/domain/streaks';
import type { Ctx, HabitData } from '@/domain/types';
import type { ColorKey } from '@/lib/palette';
import { toColorKey, toSchedule, type HabitRow, type ScheduleRow } from './habit-view';

export interface PauseRow {
  habit_id: string;
  archived_on: string;
  restored_on: string | null;
}

export function toHabitData(habit: HabitRow, schedules: ScheduleRow[], pauses: PauseRow[], completionDates: string[]): HabitData {
  return {
    startDate: habit.start_date,
    schedules: schedules.map(toSchedule),
    pauses: pauses.map((p) => ({ from: p.archived_on, to: p.restored_on })),
    completions: new Set(completionDates),
  };
}

export interface TodayRow {
  id: string;
  name: string;
  icon: string;
  color: ColorKey;
  ticked: boolean;
  /** The current streak, only when viewing today and above 0. */
  streak: Streak | null;
  /** Progress this week, for weekly habits only. */
  week: WeekProgress | null;
}

export interface TodayView {
  todo: TodayRow[];
  done: TodayRow[];
  /** True when at least one habit is not archived, whatever the viewed day. */
  hasHabits: boolean;
}

const isArchivedNow = (data: HabitData) => data.pauses.some((p) => p.to === null);

/** `habits` must already be in the order to show (creation order). */
export function buildTodayView(habits: { habit: HabitRow; data: HabitData }[], date: CalendarDate, ctx: Ctx): TodayView {
  const view: TodayView = { todo: [], done: [], hasHabits: habits.some((h) => !isArchivedNow(h.data)) };
  for (const { habit, data } of habits) {
    if (!isListedOn(data, date, ctx)) continue;
    const ticked = data.completions.has(date);
    const streak = date === ctx.today ? currentStreak(data, ctx) : null;
    (ticked ? view.done : view.todo).push({
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: toColorKey(habit.color),
      ticked,
      streak: streak && streak.count > 0 ? streak : null,
      week: weekProgress(data, date, ctx),
    });
  }
  return view;
}

/** The viewed day from the URL: a real date up to today, otherwise today. */
export function parseDateParam(value: string | string[] | undefined, today: CalendarDate): CalendarDate {
  return typeof value === 'string' && isCalendarDate(value) && value <= today ? value : today;
}

/** The earliest day worth showing: the earliest start date among habits that are not archived, or today. */
export function earliestDate(habits: { data: HabitData }[], today: CalendarDate): CalendarDate {
  const starts = habits.filter((h) => !isArchivedNow(h.data)).map((h) => h.data.startDate);
  return starts.length > 0 ? starts.reduce((a, b) => (b < a ? b : a)) : today;
}
