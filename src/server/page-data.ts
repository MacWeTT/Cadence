// What each page shows, built from the habits already loaded. Pure, so the server (rows from Supabase) and the desktop
// app (rows from SQLite) build their pages with exactly the same code. Kept free of `server-only`.
import type { Ctx } from '@/domain/types';
import type { FocusTotals } from '@/server/focus-view';
import type { HabitEntry } from '@/server/habit-data';
import type { Profile } from '@/server/habits';
import type { HomeData } from '@/server/home';
import { buildHomeView } from '@/server/home-view';
import type { ProgressData } from '@/server/progress';
import { buildProgress, parseRange } from '@/server/progress-view';
import type { TodayData } from '@/server/today';
import { buildTodayView, earliestDate, parseDateParam } from '@/server/today-view';

/** Every habit (archived ones too) with its schedules, pauses and ticks, in creation order, plus the person's day. */
export interface LoadedHabits {
  entries: HabitEntry[];
  ctx: Ctx;
  profile: Profile;
}

export const toTodayData = (loaded: LoadedHabits, dateParam: string | string[] | undefined): TodayData => {
  const { entries, ctx } = loaded;
  const { today } = ctx;
  const date = parseDateParam(dateParam, today);

  if (entries.length === 0) {
    return { view: { todo: [], done: [], optional: [], strip: [], hasHabits: false }, date, today, earliest: today };
  }

  return { view: buildTodayView(entries, date, ctx), date, today, earliest: earliestDate(entries, today) };
};

export const toHomeData = (loaded: LoadedHabits): HomeData => {
  const { entries, ctx, profile } = loaded;
  const { today, weekStartsOn } = ctx;
  const { displayName, timezone } = profile;

  return { ...buildHomeView(entries, ctx), today, name: displayName, timezone, weekStartsOn };
};

/** `focusFor` reads the focus time for the habit filter and window, wherever the sessions are kept. */
export const toProgressData = async (
  loaded: LoadedHabits,
  habit: string | undefined,
  range: string | undefined,
  focusFor: (habit: string | null, days: number) => Promise<FocusTotals>,
): Promise<ProgressData> => {
  const { entries, ctx } = loaded;

  if (entries.length === 0) {
    return { view: null, habits: [], focus: { totalSeconds: 0, byHabit: [] } };
  }

  const days = parseRange(range);
  const selected = entries.find(({ habit: { id } }) => {
    return id === habit;
  })?.habit.id;

  return {
    view: buildProgress(entries, habit, days, ctx),
    focus: await focusFor(selected ?? null, days),
    habits: entries.map(({ habit: { id, icon, name } }) => {
      return { id, icon, name };
    }),
  };
};
