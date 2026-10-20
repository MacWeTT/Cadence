import 'server-only';
import { connection } from 'next/server';
import { z } from 'zod';
import { circleNameProblem, type Label, type Level } from '@/domain/circles';
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server';
import { circleErrorCode } from '@/server/circle-errors';
import { toCircleView, type CircleView } from '@/server/circles-view';
import { HabitError } from '@/server/habits';

/** One of the person's circles, for the list. */
export interface CircleListItem {
  id: string;
  name: string;
  isOwner: boolean;
}

/** What an invite opens, for the "Join this circle?" screen. */
const previewSchema = z.object({
  name: z.string(),
  full: z.boolean(),
  members: z.array(z.object({ tag: z.string(), display_name: z.string().nullable() })),
});

export type InvitePreview = z.infer<typeof previewSchema>;

/** The database raises short codes; a known one becomes a message, anything else the generic failure. */
const check = <T>(result: { data: T; error: { message: string } | null }): T => {
  const { data, error } = result;

  if (error) {
    throw new HabitError(circleErrorCode(error.message));
  }

  return data;
};

/** Like `check`, for a call that must answer with something. */
const need = <T>(result: { data: T; error: { message: string } | null }): NonNullable<T> => {
  const data = check(result);

  if (data === null || data === undefined) {
    throw new HabitError('generic');
  }

  return data;
};

export const listCircles = async (): Promise<CircleListItem[]> => {
  await connection(); // the Supabase client reads the clock (token expiry); this must only run at request time
  const supabase = await createSupabaseServerClient();
  const user = await getUser();
  const rows = need(await supabase.from('circles').select('id, name, owner_id').order('created_at'));

  return rows.map(({ id, name, owner_id }) => {
    return { id, name, isOwner: owner_id === user?.id };
  });
};

/** A circle as the caller may see it. Throws `notAMember` when they are not in it. */
export const getCircle = async (circleId: string): Promise<CircleView> => {
  await connection();
  const supabase = await createSupabaseServerClient();

  return toCircleView(need(await supabase.rpc('circle_overview', { p_circle: circleId })));
};

export const createCircle = async (name: string): Promise<string> => {
  if (circleNameProblem(name)) {
    throw new HabitError('circleNameInvalid');
  }

  const supabase = await createSupabaseServerClient();

  return need(await supabase.rpc('create_circle', { p_name: name }));
};

/** A new invite token (the old ones stop working). It is shown once; only its hash is kept. */
export const createInvite = async (circleId: string): Promise<string> => {
  const supabase = await createSupabaseServerClient();

  return need(await supabase.rpc('create_invite', { p_circle: circleId }));
};

export const previewInvite = async (token: string): Promise<InvitePreview> => {
  await connection();
  const supabase = await createSupabaseServerClient();

  return previewSchema.parse(need(await supabase.rpc('circle_invite_preview', { p_token: token })));
};

export const joinCircle = async (token: string): Promise<string> => {
  const supabase = await createSupabaseServerClient();

  return need(await supabase.rpc('join_circle', { p_token: token }));
};

export const leaveCircle = async (circleId: string): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(await supabase.rpc('leave_circle', { p_circle: circleId }));
};

export const removeMember = async (circleId: string, userId: string): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(await supabase.rpc('remove_member', { p_circle: circleId, p_user: userId }));
};

export const deleteCircle = async (circleId: string): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(await supabase.rpc('delete_circle', { p_circle: circleId }));
};

/** How much of a habit a circle sees. `hidden` takes the share back. */
export const setShare = async (habitId: string, circleId: string, level: Level, label?: Label): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(await supabase.rpc('set_share', { p_habit: habitId, p_circle: circleId, p_level: level, p_label: label }));
};

/** One person's level for a habit, in place of the circle's. `inherit` removes it. */
export const setShareOverride = async (
  habitId: string,
  circleId: string,
  viewerId: string,
  level: Level | 'inherit',
  label?: Label,
): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(
    await supabase.rpc('set_share_override', {
      p_habit: habitId,
      p_circle: circleId,
      p_viewer: viewerId,
      p_level: level,
      p_label: label,
    }),
  );
};

export const setCirclePrefs = async (circleId: string, inWeek: boolean, allowCheers: boolean): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(await supabase.rpc('set_circle_prefs', { p_circle: circleId, p_in_week: inWeek, p_allow_cheers: allowCheers }));
};

export const sendCheer = async (circleId: string, toUser: string, forDate: string): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(await supabase.rpc('send_cheer', { p_circle: circleId, p_to: toUser, p_for: forDate }));
};

/** The pause-sharing switch: while on, nobody sees anything. The settings are kept. */
export const setCirclesPaused = async (paused: boolean): Promise<void> => {
  const user = await getUser();

  if (!user) {
    throw new HabitError('signIn');
  }

  const supabase = await createSupabaseServerClient();

  check(await supabase.from('profiles').update({ circles_paused: paused }).eq('user_id', user.id));
};
