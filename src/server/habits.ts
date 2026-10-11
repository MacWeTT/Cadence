import 'server-only';
import { connection } from 'next/server';
import { todayIn, type CalendarDate, type WeekStart } from '@/domain/dates';
import { planScheduleChange } from '@/domain/schedule-change';
import { formatCalendarDate } from '@/lib/format';
import { isValidTimeZone, type FieldIssue, type HabitInput } from '@/lib/habit-schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type en from '@locales/en';
import { fetchAll } from '@/server/fetch-all';
import { toListItem, toSchedule, type HabitListItem } from '@/server/habit-view';

/** The name of a message in `locales/en/errors.json`. */
export type ErrorCode = keyof typeof en.errors;

/** An expected failure. The code (and any field problems) are translated into text by the action that catches it. */
export class HabitError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly fieldIssues?: Record<string, FieldIssue>,
  ) {
    super(code);
  }
}

export interface Profile {
  timezone: string;
  weekStartsOn: WeekStart;
  today: CalendarDate;
  /** The Google display name, if any. */
  displayName: string | null;
}

export interface HabitsView {
  active: HabitListItem[];
  archived: HabitListItem[];
  profile: Profile;
}

export const getProfile = async (): Promise<Profile> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('timezone, week_starts_on, display_name')
    .maybeSingle();

  if (error) {
    throw error;
  }

  const stored = data?.timezone;
  const timezone = stored && isValidTimeZone(stored) ? stored : 'UTC';

  return {
    timezone,
    weekStartsOn: data?.week_starts_on === 7 ? 7 : 1,
    today: todayIn(timezone),
    displayName: data?.display_name ?? null,
  };
};

export const listHabits = async (): Promise<HabitsView> => {
  await connection(); // the Supabase client reads the clock (token expiry); this must only run at request time
  const profile = await getProfile();
  const supabase = await createSupabaseServerClient();
  const { data: habits, error } = await supabase.from('habits').select('*').order('created_at');

  if (error) {
    throw error;
  }

  if (habits.length === 0) {
    return { active: [], archived: [], profile };
  }

  const ids = habits.map(h => {
    return h.id;
  });
  const [{ data: scheduleRows, error: scheduleError }, completions] = await Promise.all([
    supabase.from('habit_schedules').select('*').in('habit_id', ids),
    // shortcut: fetches one row per tick just to know which habits have any (paged past the API's row cap); use a
    // count or an RPC when the volume grows.
    fetchAll((from, to) => {
      return supabase
        .from('habit_completions')
        .select('habit_id, completion_date')
        .in('habit_id', ids)
        .order('habit_id')
        .order('completion_date')
        .range(from, to);
    }),
  ]);

  if (scheduleError) {
    throw scheduleError;
  }

  const withTicks = new Set(
    completions.map(c => {
      return c.habit_id;
    }),
  );

  const items = habits.map(h => {
    const { id } = h;

    return toListItem(
      h,
      scheduleRows.filter(s => {
        return s.habit_id === id;
      }),
      withTicks.has(id),
      profile.today,
    );
  });

  return {
    active: items.filter(i => {
      return !i.archivedAt;
    }),
    archived: items.filter(i => {
      return i.archivedAt;
    }),
    profile,
  };
};

// A Postgres exception raised by our functions (P0001) means the habit is missing, not yours, or in the wrong state.
const failRpc = (error: { code?: string; message: string }): never => {
  const { code, message } = error;

  if (code === 'P0001') {
    throw new HabitError('habitChanged');
  }

  throw new Error(message);
};

export const createHabit = async (input: HabitInput): Promise<void> => {
  const { name, description, icon, color, startDate, kind, timesPerWeek } = input;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('create_habit', {
    p_name: name,
    p_description: description ?? '',
    p_icon: icon,
    p_color: color,
    p_start_date: startDate,
    p_kind: kind,
    // The generated argument types are non-null, but the function accepts null for a daily habit.
    p_times_per_week: (timesPerWeek ?? null) as number,
  });

  if (error) {
    failRpc(error);
  }
};

export const updateHabit = async (id: string, input: HabitInput): Promise<void> => {
  const { name, description, icon, color, startDate, kind, timesPerWeek } = input;
  const supabase = await createSupabaseServerClient();
  const { weekStartsOn, today } = await getProfile();

  const { data: habit, error } = await supabase.from('habits').select('*').eq('id', id).maybeSingle();

  if (error) {
    throw error;
  }

  if (!habit) {
    throw new HabitError('habitNotFound');
  }

  if (habit.archived_at) {
    throw new HabitError('editArchived');
  }

  const { data: firstTicks, error: firstError } = await supabase
    .from('habit_completions')
    .select('completion_date')
    .eq('habit_id', id)
    .order('completion_date')
    .limit(1);

  if (firstError) {
    throw firstError;
  }

  const firstTick = firstTicks[0]?.completion_date;

  if (firstTick && startDate > firstTick) {
    throw new HabitError('checkStartDate', {
      startDate: { code: 'startAfterFirstTick', values: { date: formatCalendarDate(firstTick) } },
    });
  }

  const { error: updateError } = await supabase
    .from('habits')
    .update({ name, description: description || null, icon, color, start_date: startDate })
    .eq('id', id);

  if (updateError) {
    throw updateError;
  }

  const { data: rows, error: rowsError } = await supabase.from('habit_schedules').select('*').eq('habit_id', id);

  if (rowsError) {
    throw rowsError;
  }

  const plan = planScheduleChange({
    schedules: rows.map(toSchedule),
    desired: kind === 'daily' ? { kind: 'daily' } : { kind: 'weekly_count', timesPerWeek: timesPerWeek ?? 1 },
    startDate,
    today,
    weekStartsOn,
    hasCompletions: firstTick !== undefined,
  });

  if (plan.action === 'none') {
    return;
  }

  const schedule = plan.action === 'delete_pending' ? null : plan.schedule;
  const { error: rpcError } = await supabase.rpc('apply_schedule_change', {
    p_habit_id: id,
    p_action: plan.action,
    p_kind: (schedule?.kind ?? null) as string,
    p_times_per_week: (schedule?.kind === 'weekly_count' ? schedule.timesPerWeek : null) as number,
    p_effective_from: (schedule?.effectiveFrom ?? null) as string,
    p_today: today,
  });

  if (rpcError) {
    failRpc(rpcError);
  }
};

export const archiveHabit = async (id: string): Promise<void> => {
  const { today } = await getProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('archive_habit', { p_habit_id: id, p_on: today });

  if (error) {
    failRpc(error);
  }
};

export const restoreHabit = async (id: string): Promise<void> => {
  const { today } = await getProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('restore_habit', { p_habit_id: id, p_on: today });

  if (error) {
    failRpc(error);
  }
};

/** Only archived habits can be deleted. */
export const deleteHabit = async (id: string): Promise<void> => {
  const supabase = await createSupabaseServerClient();
  const { data: habit, error } = await supabase.from('habits').select('archived_at').eq('id', id).maybeSingle();

  if (error) {
    throw error;
  }

  if (!habit) {
    throw new HabitError('habitNotFound');
  }

  if (!habit.archived_at) {
    throw new HabitError('deleteNeedsArchive');
  }

  const { error: deleteError } = await supabase.from('habits').delete().eq('id', id);

  if (deleteError) {
    throw deleteError;
  }
};
