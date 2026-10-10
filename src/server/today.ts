import 'server-only';
import { connection } from 'next/server';
import type { CalendarDate } from '@/domain/dates';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchAll } from './fetch-all';
import { getProfile } from './habits';
import { buildTodayView, earliestDate, parseDateParam, toHabitData, type TodayView } from './today-view';

export interface TodayData {
  view: TodayView;
  /** The viewed day (from the URL, clamped to today). */
  date: CalendarDate;
  today: CalendarDate;
  /** The earliest day with anything to show; the previous-day arrow stops here. */
  earliest: CalendarDate;
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
  return groups;
}

export async function getTodayView(dateParam: string | string[] | undefined): Promise<TodayData> {
  await connection(); // the Supabase client reads the clock (token expiry); this must only run at request time
  const profile = await getProfile();
  const ctx = { today: profile.today, weekStartsOn: profile.weekStartsOn };
  const date = parseDateParam(dateParam, profile.today);

  const supabase = await createSupabaseServerClient();
  const { data: habits, error } = await supabase.from('habits').select('*').order('created_at');
  if (error) throw error;
  if (habits.length === 0) return { view: { todo: [], done: [], strip: [], hasHabits: false }, date, today: profile.today, earliest: profile.today };

  const ids = habits.map((h) => h.id);
  const [schedules, periods, completions] = await Promise.all([
    supabase.from('habit_schedules').select('*').in('habit_id', ids),
    supabase.from('habit_archive_periods').select('*').in('habit_id', ids),
    // shortcut: loads every completion date ever (paged past the API's row cap); limit it to a window or aggregate
    // in SQL when the volume grows.
    fetchAll((from, to) =>
      supabase
        .from('habit_completions')
        .select('habit_id, completion_date')
        .in('habit_id', ids)
        .order('habit_id')
        .order('completion_date')
        .range(from, to),
    ),
  ]);
  if (schedules.error) throw schedules.error;
  if (periods.error) throw periods.error;

  const schedulesBy = groupBy(schedules.data, (s) => s.habit_id);
  const periodsBy = groupBy(periods.data, (p) => p.habit_id);
  const completionsBy = groupBy(completions, (c) => c.habit_id);
  const entries = habits.map((habit) => ({
    habit,
    data: toHabitData(
      habit,
      schedulesBy.get(habit.id) ?? [],
      periodsBy.get(habit.id) ?? [],
      (completionsBy.get(habit.id) ?? []).map((c) => c.completion_date),
    ),
  }));

  return { view: buildTodayView(entries, date, ctx), date, today: profile.today, earliest: earliestDate(entries, profile.today) };
}
