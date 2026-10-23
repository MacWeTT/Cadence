import type { SupabaseClient } from '@supabase/supabase-js';
import type { Backup, BackupSummary } from '@/lib/backup-types';
import type { Database } from '@/lib/supabase/database.types';
import { buildBackup } from '@/server/backup-view';
import { fetchAll } from '@/server/fetch-all';

/** Everything the account holds that a backup carries, as one backup. Reads through the person's own session. */
export const readAccountBackup = async (supabase: SupabaseClient<Database>, id: string): Promise<Backup> => {
  const [{ data: profileRow, error: profileError }, habits, schedules, ticks, pauses, focus] = await Promise.all([
    supabase.from('profiles').select('display_name, timezone, week_starts_on').eq('user_id', id).single(),
    fetchAll((from, to) => {
      return supabase
        .from('habits')
        .select('id, name, description, icon, color, start_date, created_at, archived_at, links')
        .order('created_at')
        .order('id')
        .range(from, to);
    }),
    fetchAll((from, to) => {
      return supabase
        .from('habit_schedules')
        .select('habit_id, kind, times_per_week, weekdays, effective_from')
        .order('habit_id')
        .order('effective_from')
        .range(from, to);
    }),
    fetchAll((from, to) => {
      return supabase
        .from('habit_completions')
        .select('habit_id, completion_date')
        .order('habit_id')
        .order('completion_date')
        .range(from, to);
    }),
    fetchAll((from, to) => {
      return supabase
        .from('habit_archive_periods')
        .select('habit_id, archived_on, restored_on')
        .order('habit_id')
        .order('archived_on')
        .range(from, to);
    }),
    fetchAll((from, to) => {
      return supabase
        .from('focus_sessions')
        .select('habit_id, started_at, ended_at, mode, plan, skipped_seconds, focus_seconds')
        .order('started_at')
        .order('id')
        .range(from, to);
    }),
  ]);

  if (profileError) {
    throw profileError;
  }

  return buildBackup({
    exportedAt: new Date().toISOString(),
    profile: profileRow,
    habits,
    schedules,
    ticks,
    pauses,
    focus,
  });
};

/** How much the account holds, for the export card and the sync (RLS limits it to the person's own rows). */
export const countAccount = async (supabase: SupabaseClient<Database>): Promise<BackupSummary> => {
  const [habits, ticks, focus] = await Promise.all([
    supabase.from('habits').select('id', { count: 'exact', head: true }),
    supabase.from('habit_completions').select('id', { count: 'exact', head: true }),
    supabase.from('focus_sessions').select('id', { count: 'exact', head: true }),
  ]);
  const { count: habitCount, error: habitError } = habits;
  const { count: tickCount, error: tickError } = ticks;
  const { count: focusCount, error: focusError } = focus;
  const error = habitError ?? tickError ?? focusError;

  if (error) {
    throw error;
  }

  return { habits: habitCount ?? 0, ticks: tickCount ?? 0, focusSessions: focusCount ?? 0 };
};
