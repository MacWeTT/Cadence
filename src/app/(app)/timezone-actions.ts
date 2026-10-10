'use server';

import { createSupabaseServerClient, getUser } from '@/lib/supabase/server';
import { shouldSyncTimezone } from '@/server/habit-view';

/** Saves the browser's timezone to the profile while it still has the UTC default. Returns true if it changed. */
export const syncTimezoneAction = async (browserTimeZone: string): Promise<boolean> => {
  const user = await getUser();

  if (!user) {
    return false;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('profiles').select('timezone').maybeSingle();

  if (!data || !shouldSyncTimezone(data.timezone, browserTimeZone)) {
    return false;
  }

  const { error } = await supabase.from('profiles').update({ timezone: browserTimeZone }).eq('user_id', user.id);

  return !error;
};
