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

/** The date n days before today, in UTC (the e2e user's profile timezone is UTC). */
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/** Creates a habit and its first schedule directly in the database for the e2e user. */
export async function seedHabit(o: {
  name: string;
  startDate: string;
  icon?: string;
  color?: string;
  kind?: 'daily' | 'weekly_count';
  timesPerWeek?: number;
}): Promise<string> {
  const admin = adminClient();
  const userId = await ensureE2EUser();
  const { data, error } = await admin
    .from('habits')
    .insert({ user_id: userId, name: o.name, icon: o.icon ?? '📖', color: o.color ?? 'moss', start_date: o.startDate })
    .select('id')
    .single();
  if (error) throw error;
  const kind = o.kind ?? 'daily';
  const { error: scheduleError } = await admin.from('habit_schedules').insert({
    habit_id: data.id,
    kind,
    times_per_week: kind === 'weekly_count' ? (o.timesPerWeek ?? 3) : null,
    effective_from: o.startDate,
  });
  if (scheduleError) throw scheduleError;
  return data.id;
}
