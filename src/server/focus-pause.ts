import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { runningRow, serverNow } from '@/server/focus-store';
import { settle } from '@/server/focus-view';

/** Holds the clock. Pausing a session that is already paused (or not running) changes nothing. */
export const pauseFocus = async (): Promise<void> => {
  const row = await runningRow();

  if (!row || row.paused_at) {
    return;
  }

  const { id } = row;
  const now = await serverNow();

  if (settle(row, now).expired) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('focus_sessions')
    .update({ paused_at: now.toISOString() })
    .eq('id', id)
    .is('paused_at', null)
    .is('ended_at', null);

  if (error) {
    throw error;
  }
};

/** Lets the clock run again, adding the pause that just ended to the paused total. Resuming a running session changes nothing. */
export const resumeFocus = async (): Promise<void> => {
  const row = await runningRow();

  if (!row?.paused_at) {
    return;
  }

  const { id, paused_at, paused_seconds } = row;
  const now = await serverNow();
  const pause = Math.max(0, Math.floor((now.getTime() - new Date(paused_at).getTime()) / 1000));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('focus_sessions')
    .update({ paused_at: null, paused_seconds: paused_seconds + pause })
    .eq('id', id)
    .eq('paused_at', paused_at)
    .is('ended_at', null);

  if (error) {
    throw error;
  }
};
