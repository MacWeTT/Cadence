"use server";

import { createSupabaseServerClient, getUser } from "@/lib/supabase/server";
import { shouldSyncTimezone } from "@/server/habit-view";

/** Saves the browser's timezone to the profile while it still has the UTC default. */
export async function syncTimezoneAction(browserTimeZone: string): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("timezone").maybeSingle();
  if (!data || !shouldSyncTimezone(data.timezone, browserTimeZone)) return;
  await supabase.from("profiles").update({ timezone: browserTimeZone }).eq("user_id", user.id);
}
