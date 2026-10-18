import 'server-only';
import { isSavedSession } from '@/domain/focus';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { settle, type FocusRow } from '@/server/focus-view';

export const COLUMNS =
  'id, habit_id, started_at, ended_at, mode, plan, skipped_seconds, paused_at, paused_seconds, focus_seconds, sound_id';

/** The database clock: the only clock a session is measured by. */
export const serverNow = async (): Promise<Date> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('server_now');

  if (error) {
    throw error;
  }

  return new Date(data);
};

export const runningRow = async (): Promise<FocusRow | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('focus_sessions').select(COLUMNS).is('ended_at', null).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

/** Saves a settled session, or drops it when it was under a minute. Only touches a session that is still running. */
export const closeRow = async (row: FocusRow, now: Date): Promise<{ focusSeconds: number; saved: boolean }> => {
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
    .update({ ended_at: endedAt, focus_seconds: focusSeconds, paused_at: null })
    .eq('id', id)
    .is('ended_at', null);

  if (error) {
    throw error;
  }

  return { focusSeconds, saved: true };
};
