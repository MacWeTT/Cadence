import 'server-only';
import { connection } from 'next/server';
import { addDays, toCalendarDate, type CalendarDate } from '@/domain/dates';
import { breakLeftAt, isSavedSession, planErrors, type FocusPlan } from '@/domain/focus';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchAll } from '@/server/fetch-all';
import {
  focusByHabit,
  parsePlan,
  settle,
  toSession,
  type FocusHabit,
  type FocusRow,
  type FocusState,
  type FocusTotals,
} from '@/server/focus-view';
import { HabitError, getProfile } from '@/server/habits';

/** What a stopped session leaves behind, for the "I did it" prompt. */
export interface FocusResult {
  habitId: string;
  focusSeconds: number;
  /** The calendar day the session started (the day "I did it" ticks). */
  date: CalendarDate;
  /** `false` when it was under a minute: nothing was saved and nothing is asked. */
  saved: boolean;
}

const COLUMNS = 'id, habit_id, started_at, ended_at, mode, plan, skipped_seconds, focus_seconds';
const RECENT_PLANS = 200;

const serverNow = async (): Promise<Date> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('server_now');

  if (error) {
    throw error;
  }

  return new Date(data);
};

const runningRow = async (): Promise<FocusRow | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('focus_sessions').select(COLUMNS).is('ended_at', null).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

/** Saves a settled session, or drops it when it was under a minute. Only touches a session that is still running. */
const closeRow = async (row: FocusRow, now: Date): Promise<{ focusSeconds: number; saved: boolean }> => {
  const { id } = row;
  const { endedAt, focusSeconds } = settle(row, now);
  const supabase = await createSupabaseServerClient();

  if (!isSavedSession(focusSeconds)) {
    const { error } = await supabase.from('focus_sessions').delete().eq('id', id).is('ended_at', null);

    if (error) {
      throw error;
    }

    return { focusSeconds, saved: false };
  }

  const { error } = await supabase
    .from('focus_sessions')
    .update({ ended_at: endedAt, focus_seconds: focusSeconds })
    .eq('id', id)
    .is('ended_at', null);

  if (error) {
    throw error;
  }

  return { focusSeconds, saved: true };
};

/** The numbers last used on each habit, read from its latest pomodoro session. */
const lastPlans = async (): Promise<Record<string, FocusPlan>> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('habit_id, plan')
    .eq('mode', 'pomodoro')
    .order('started_at', { ascending: false })
    .limit(RECENT_PLANS);

  if (error) {
    throw error;
  }

  const plans: Record<string, FocusPlan> = {};

  for (const { habit_id, plan } of data) {
    const parsed = parsePlan(plan);

    if (parsed && !(habit_id in plans)) {
      plans[habit_id] = parsed;
    }
  }

  return plans;
};

const habitOf = async (habitId: string): Promise<FocusHabit> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('habits').select('name, icon, color').eq('id', habitId).single();

  if (error) {
    throw error;
  }

  return data;
};

/** The running session (an expired one stays until it is stopped, so the person still gets the "I did it" prompt). */
export const getFocusState = async (): Promise<FocusState> => {
  await connection(); // the Supabase client reads the clock; this must only run at request time
  const [now, row, plans] = await Promise.all([serverNow(), runningRow(), lastPlans()]);

  return { running: row ? toSession(row, await habitOf(row.habit_id)) : null, serverNow: now.toISOString(), plans };
};

export const startFocus = async (habitId: string, mode: 'free' | 'pomodoro', plan: FocusPlan | null): Promise<void> => {
  if (mode === 'pomodoro' && (!plan || planErrors(plan).length > 0)) {
    throw new HabitError('focusPlanInvalid');
  }

  const supabase = await createSupabaseServerClient();
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .select('id, archived_at')
    .eq('id', habitId)
    .maybeSingle();

  if (habitError) {
    throw habitError;
  }

  if (!habit || habit.archived_at) {
    throw new HabitError('habitNotFound');
  }

  const running = await runningRow();

  if (running) {
    const now = await serverNow();

    if (!settle(running, now).expired) {
      throw new HabitError('focusRunning');
    }

    await closeRow(running, now);
  }

  const { error } = await supabase
    .from('focus_sessions')
    .insert({ habit_id: habitId, mode, plan: mode === 'pomodoro' && plan ? { ...plan } : null });

  if (error) {
    if (error.code === '23505') {
      throw new HabitError('focusRunning');
    }

    throw error;
  }
};

export const stopFocus = async (): Promise<FocusResult | null> => {
  const row = await runningRow();

  if (!row) {
    return null;
  }

  const [now, { timezone }] = await Promise.all([serverNow(), getProfile()]);
  const { focusSeconds, saved } = await closeRow(row, now);
  const { habit_id, started_at } = row;

  return { habitId: habit_id, focusSeconds, date: toCalendarDate(started_at, timezone), saved };
};

/** Moves the rest of the plan earlier by the seconds left in the break running now. */
export const skipBreak = async (): Promise<void> => {
  const row = await runningRow();
  const plan = row?.mode === 'pomodoro' ? parsePlan(row.plan) : null;

  if (!row || !plan) {
    return;
  }

  const { id, started_at, skipped_seconds } = row;
  const now = await serverNow();
  const elapsed = Math.floor((now.getTime() - new Date(started_at).getTime()) / 1000) + skipped_seconds;
  const left = breakLeftAt(plan, elapsed);

  if (left === 0) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('focus_sessions')
    .update({ skipped_seconds: skipped_seconds + left })
    .eq('id', id)
    .eq('skipped_seconds', skipped_seconds)
    .is('ended_at', null);

  if (error) {
    throw error;
  }
};

/** Focus time for the Progress card: the last `days` days up to today, for one habit or all. */
export const getFocusTotals = async (
  habit: string | null,
  days: number,
  today: CalendarDate,
  timeZone: string,
): Promise<FocusTotals> => {
  const from = addDays(today, 1 - days);
  // a day's start can be up to a day off UTC, so read a day wider and let the pure step place each session
  const since = new Date(`${addDays(from, -1)}T00:00:00Z`).toISOString();
  const supabase = await createSupabaseServerClient();

  const rows = await fetchAll((start, end) => {
    const query = supabase
      .from('focus_sessions')
      .select('id, habit_id, started_at, focus_seconds')
      .not('ended_at', 'is', null)
      .gte('started_at', since)
      .order('started_at')
      .order('id')
      .range(start, end);

    return habit ? query.eq('habit_id', habit) : query;
  });

  return focusByHabit(
    rows.map(({ habit_id, started_at, focus_seconds }) => {
      return { habitId: habit_id, startedAt: started_at, focusSeconds: focus_seconds ?? 0 };
    }),
    from,
    today,
    timeZone,
  );
};
