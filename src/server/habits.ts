import 'server-only';
import { connection } from 'next/server';
import { todayIn, type CalendarDate, type WeekStart } from '@/domain/dates';
import { planScheduleChange } from '@/domain/schedule-change';
import { formatCalendarDate } from '@/lib/format';
import { isValidTimeZone, type HabitInput } from '@/lib/habit-schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchAll } from './fetch-all';
import { toListItem, toSchedule, type HabitListItem } from './habit-view';

/** An expected failure with a message that is safe to show the user. */
export class HabitError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
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

  const timezone = data && isValidTimeZone(data.timezone) ? data.timezone : 'UTC';

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
  const [schedules, completions] = await Promise.all([
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

  if (schedules.error) {
    throw schedules.error;
  }

  const withTicks = new Set(
    completions.map(c => {
      return c.habit_id;
    }),
  );

  const items = habits.map(h => {
    return toListItem(
      h,
      schedules.data.filter(s => {
        return s.habit_id === h.id;
      }),
      withTicks.has(h.id),
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
  if (error.code === 'P0001') {
    throw new HabitError('That habit could not be found, or it has already changed.');
  }

  throw new Error(error.message);
};

export const createHabit = async (input: HabitInput): Promise<void> => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('create_habit', {
    p_name: input.name,
    p_description: input.description ?? '',
    p_icon: input.icon,
    p_color: input.color,
    p_start_date: input.startDate,
    p_kind: input.kind,
    // The generated argument types are non-null, but the function accepts null for a daily habit.
    p_times_per_week: (input.timesPerWeek ?? null) as number,
  });

  if (error) {
    failRpc(error);
  }
};

export const updateHabit = async (id: string, input: HabitInput): Promise<void> => {
  const supabase = await createSupabaseServerClient();
  const { weekStartsOn, today } = await getProfile();

  const { data: habit, error } = await supabase.from('habits').select('*').eq('id', id).maybeSingle();

  if (error) {
    throw error;
  }

  if (!habit) {
    throw new HabitError('That habit could not be found.');
  }

  if (habit.archived_at) {
    throw new HabitError('Restore this habit before editing it.');
  }

  const first = await supabase
    .from('habit_completions')
    .select('completion_date')
    .eq('habit_id', id)
    .order('completion_date')
    .limit(1);

  if (first.error) {
    throw first.error;
  }

  const firstTick = first.data[0]?.completion_date;

  if (firstTick && input.startDate > firstTick) {
    throw new HabitError('Check the start date.', {
      startDate: `The start date can't be after your first check-in on ${formatCalendarDate(firstTick)}.`,
    });
  }

  const { error: updateError } = await supabase
    .from('habits')
    .update({
      name: input.name,
      description: input.description || null,
      icon: input.icon,
      color: input.color,
      start_date: input.startDate,
    })
    .eq('id', id);

  if (updateError) {
    throw updateError;
  }

  const rows = await supabase.from('habit_schedules').select('*').eq('habit_id', id);

  if (rows.error) {
    throw rows.error;
  }

  const plan = planScheduleChange({
    schedules: rows.data.map(toSchedule),
    desired:
      input.kind === 'daily' ? { kind: 'daily' } : { kind: 'weekly_count', timesPerWeek: input.timesPerWeek ?? 1 },
    startDate: input.startDate,
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
    throw new HabitError('That habit could not be found.');
  }

  if (!habit.archived_at) {
    throw new HabitError('Archive a habit before deleting it.');
  }

  const { error: deleteError } = await supabase.from('habits').delete().eq('id', id);

  if (deleteError) {
    throw deleteError;
  }
};
