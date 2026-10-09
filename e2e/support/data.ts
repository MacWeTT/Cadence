import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase/database.types';

export const E2E_USER = { email: 'e2e@cadence.test', password: 'e2e-password-123!' };

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Add it to .env.local (see .env.example).`);
  return value;
}

/** Service-role client for e2e setup and assertions only. Never import this from application code. */
export function adminClient() {
  return createClient<Database>(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function ensureE2EUser(): Promise<string> {
  const admin = adminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    ...E2E_USER,
    email_confirm: true,
    user_metadata: { full_name: 'E2E User' },
  });
  if (created?.user) return created.user.id;
  if (error && error.code !== 'email_exists') throw error;
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === E2E_USER.email);
  if (!existing) throw new Error('E2E user exists but could not be found');
  return existing.id;
}

/** Deletes every habit of the e2e user (cascading to schedules, completions and archive periods). */
export async function resetUserData(): Promise<void> {
  const userId = await ensureE2EUser();
  const { error } = await adminClient().from('habits').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function getHabits() {
  const userId = await ensureE2EUser();
  const { data, error } = await adminClient().from('habits').select('*').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return data;
}

export async function getSchedules(habitId: string) {
  const { data, error } = await adminClient().from('habit_schedules').select('*').eq('habit_id', habitId).order('effective_from');
  if (error) throw error;
  return data;
}

export async function getArchivePeriods(habitId: string) {
  const { data, error } = await adminClient().from('habit_archive_periods').select('*').eq('habit_id', habitId).order('archived_on');
  if (error) throw error;
  return data;
}

export async function seedCompletion(habitId: string, date: string): Promise<void> {
  const { error } = await adminClient().from('habit_completions').insert({ habit_id: habitId, completion_date: date });
  if (error) throw error;
}
