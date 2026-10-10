// Pure mapping from database rows to what the Today page shows. Kept free of `server-only` so it can be unit-tested.
import { addDays, isCalendarDate, weekStart, type CalendarDate } from '@/domain/dates';
import { isListedOn, weekProgress, type WeekProgress } from '@/domain/listing';
import { scheduleFor } from '@/domain/schedule';
import { dayStatus } from '@/domain/status';
import { currentStreak, type Streak } from '@/domain/streaks';
import type { Ctx, HabitData } from '@/domain/types';
import type { ColorKey } from '@/lib/palette';
import { toColorKey, toSchedule, type HabitRow, type ScheduleRow } from './habit-view';

export interface PauseRow {
  habit_id: string;
  archived_on: string;
  restored_on: string | null;
}

export const toHabitData = (
  habit: HabitRow,
  schedules: ScheduleRow[],
  pauses: PauseRow[],
  completionDates: string[],
): HabitData => {
  return {
    startDate: habit.start_date,
    schedules: schedules.map(toSchedule),
    pauses: pauses.map(p => {
      return { from: p.archived_on, to: p.restored_on };
    }),
    completions: new Set(completionDates),
  };
};

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

/** One day of the week strip: habits done out of habits expected, and whether the day has not happened yet. */
export interface DaySummary {
  date: CalendarDate;
  done: number;
  total: number;
  future: boolean;
}

export interface TodayView {
  todo: TodayRow[];
  done: TodayRow[];
  /** The seven days of the viewed week, for the side card. */
  strip: DaySummary[];
  /** True when at least one habit is not archived, whatever the viewed day. */
  hasHabits: boolean;
}

const isArchivedNow = (data: HabitData) => {
  return data.pauses.some(p => {
    return p.to === null;
  });
};

/** `habits` must already be in the order to show (creation order). */
export const buildTodayView = (
  habits: { habit: HabitRow; data: HabitData }[],
  date: CalendarDate,
  ctx: Ctx,
): TodayView => {
  const view: TodayView = {
    todo: [],
    done: [],
    strip: weekStrip(
      habits.map(h => {
        return h.data;
      }),
      date,
      ctx,
    ),
    hasHabits: habits.some(h => {
      return !isArchivedNow(h.data);
    }),
  };

  for (const { habit, data } of habits) {
    if (!isListedOn(data, date, ctx)) {
      continue;
    }

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
};

/**
 * The week containing `date`, one summary per day. A daily habit is expected on every day it is active; a weekly habit
 * only counts on the days it was ticked, because no particular day is expected of it.
 */
export const weekStrip = (habits: HabitData[], date: CalendarDate, ctx: Ctx): DaySummary[] => {
  const first = weekStart(date, ctx.weekStartsOn);

  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(first, i);
    let done = 0;
    let total = 0;

    for (const h of habits) {
      const ticked = h.completions.has(day);
      const expected = scheduleFor(h, day)?.kind === 'weekly_count' ? ticked : dayStatus(h, day, ctx) !== 'inactive';

      if (expected) {
        total++;
      }

      if (expected && ticked) {
        done++;
      }
    }

    return { date: day, done, total, future: day > ctx.today };
  });
};

/** The viewed day from the URL: a real date up to today, otherwise today. */
export const parseDateParam = (value: string | string[] | undefined, today: CalendarDate): CalendarDate => {
  return typeof value === 'string' && isCalendarDate(value) && value <= today ? value : today;
};

/** The earliest day worth showing: the earliest start date among habits that are not archived, or today. */
export const earliestDate = (habits: { data: HabitData }[], today: CalendarDate): CalendarDate => {
  const starts = habits
    .filter(h => {
      return !isArchivedNow(h.data);
    })
    .map(h => {
      return h.data.startDate;
    });

  return starts.length > 0
    ? starts.reduce((a, b) => {
        return b < a ? b : a;
      })
    : today;
};

/**
 * The view after ticking or unticking one row, for the optimistic update: moves the row between the two lists and
 * adjusts weekly progress. Streaks are left alone; the server refresh brings the real ones.
 */
export const applyToggle = (view: TodayView, id: string, ticked: boolean): TodayView => {
  const row = [...view.todo, ...view.done].find(r => {
    return r.id === id;
  });

  if (!row || row.ticked === ticked) {
    return view;
  }

  const week = row.week && {
    ...row.week,
    done: Math.max(0, row.week.done + (ticked ? 1 : -1)),
  };
  const next: TodayRow = { ...row, ticked, week: week && { ...week, goalMet: week.done >= week.target } };

  const rest = (rows: TodayRow[]) => {
    return rows.filter(r => {
      return r.id !== id;
    });
  };

  return {
    ...view,
    todo: ticked ? rest(view.todo) : [...rest(view.todo), next],
    done: ticked ? [...rest(view.done), next] : rest(view.done),
  };
};
