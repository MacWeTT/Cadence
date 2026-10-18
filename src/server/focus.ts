import 'server-only';
import { connection } from 'next/server';
import { addDays, toCalendarDate, type CalendarDate } from '@/domain/dates';
import { activeSeconds, breakLeftAt, planErrors, type FocusPlan } from '@/domain/focus';
import { isChimeId } from '@/lib/chimes';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchAll } from '@/server/fetch-all';
import { closeRow, runningRow, serverNow } from '@/server/focus-store';
import {
  focusByHabit,
  lastSoundsOf,
  parsePlan,
  settle,
  toSession,
  type FocusHabit,
  type FocusState,
  type FocusTotals,
} from '@/server/focus-view';
import { HabitError, getProfile } from '@/server/habits';

/** What a stopped session leaves behind, for the "I did it" prompt. */
export interface FocusResult {
  /** The saved session, so it can be discarded if the person says it did not count. */
  sessionId: string;
  habitId: string;
  focusSeconds: number;
  /** The calendar day the session started (the day "I did it" ticks). */
  date: CalendarDate;
  /** `false` when it was under a minute: nothing was saved and nothing is asked. */
  saved: boolean;
}

const RECENT_PLANS = 200;

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
/** The sound last chosen on each habit, from its latest sessions. */
const lastSounds = async (): Promise<Record<string, string>> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('habit_id, sound_id')
    .order('started_at', { ascending: false })
    .limit(RECENT_PLANS);

  if (error) {
    throw error;
  }

  return lastSoundsOf(data);
};

export const getFocusState = async (): Promise<FocusState> => {
  await connection(); // the Supabase client reads the clock; this must only run at request time
  const [now, found, plans, sounds] = await Promise.all([serverNow(), runningRow(), lastPlans(), lastSounds()]);

  // a session left paused for 12 hours is closed with the time up to its pause
  const abandoned = found?.paused_at && settle(found, now).expired;

  if (found && abandoned) {
    await closeRow(found, now);
  }

  const row = abandoned ? null : found;

  return {
    running: row ? toSession(row, await habitOf(row.habit_id)) : null,
    serverNow: now.toISOString(),
    plans,
    sounds,
  };
};

export const startFocus = async (
  habitId: string,
  mode: 'free' | 'pomodoro',
  plan: FocusPlan | null,
  soundId: string | null,
): Promise<void> => {
  if (mode === 'pomodoro' && (!plan || planErrors(plan).length > 0)) {
    throw new HabitError('focusPlanInvalid');
  }

  const supabase = await createSupabaseServerClient();

  // A sound of the person's own must still exist (it is theirs to remove at any time).
  if (soundId !== null && !isChimeId(soundId)) {
    const { data: sound } = await supabase.from('custom_sounds').select('id').eq('id', soundId).maybeSingle();

    if (!sound) {
      throw new HabitError('focusSoundInvalid');
    }
  }

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
    .insert({ habit_id: habitId, mode, plan: mode === 'pomodoro' && plan ? { ...plan } : null, sound_id: soundId });

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
  const { id, habit_id, started_at } = row;

  return { sessionId: id, habitId: habit_id, focusSeconds, date: toCalendarDate(started_at, timezone), saved };
};

/**
 * Removes a finished session: its focus time must not count (the person unticked "I did it"). A running session is not
 * touched, and only the person's own rows can be reached.
 */
export const discardFocusSession = async (sessionId: string): Promise<void> => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('focus_sessions').delete().eq('id', sessionId).not('ended_at', 'is', null);

  if (error) {
    throw error;
  }
};

/** Moves the rest of the plan earlier by the seconds left in the break running now. */
export const skipBreak = async (): Promise<void> => {
  const row = await runningRow();
  const plan = row?.mode === 'pomodoro' ? parsePlan(row.plan) : null;

  if (!row || !plan) {
    return;
  }

  const { id, started_at, skipped_seconds, paused_at, paused_seconds } = row;

  // a break cannot be skipped while the clock is held
  if (paused_at) {
    return;
  }

  const now = await serverNow();
  const elapsed = activeSeconds(started_at, paused_seconds, null, now.getTime()) + skipped_seconds;
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
