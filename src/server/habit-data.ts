import 'server-only';
import { connection } from 'next/server';
import type { Ctx, HabitData } from '@/domain/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchAll } from './fetch-all';
import type { HabitRow } from './habit-view';
import { getProfile, type Profile } from './habits';
import { toHabitData } from './today-view';

export interface HabitEntry {
  habit: HabitRow;
  data: HabitData;
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
  return groups;
}

/** Every habit (archived ones too) with its schedules, pauses and ticks, in creation order, plus the user's day context. */
export async function loadHabitData(): Promise<{ entries: HabitEntry[]; ctx: Ctx; profile: Profile }> {
  await connection(); // the Supabase client reads the clock (token expiry); this must only run at request time
  const profile = await getProfile();
  const ctx = { today: profile.today, weekStartsOn: profile.weekStartsOn };

  const supabase = await createSupabaseServerClient();
  const { data: habits, error } = await supabase.from('habits').select('*').order('created_at');
  if (error) throw error;
  if (habits.length === 0) return { entries: [], ctx, profile };

  const ids = habits.map(h => h.id);
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

  const schedulesBy = groupBy(schedules.data, s => s.habit_id);
  const periodsBy = groupBy(periods.data, p => p.habit_id);
  const completionsBy = groupBy(completions, c => c.habit_id);
  const entries = habits.map(habit => ({
    habit,
    data: toHabitData(
      habit,
      schedulesBy.get(habit.id) ?? [],
      periodsBy.get(habit.id) ?? [],
      (completionsBy.get(habit.id) ?? []).map(c => c.completion_date),
    ),
  }));
  return { entries, ctx, profile };
}
