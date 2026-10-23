import 'server-only';
import { connection } from 'next/server';
import { circleNameProblem, type CircleColor, type Label, type Level, type Reaction } from '@/domain/circles';
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server';
import { circleErrorCode } from '@/server/circle-errors';
import { toSharingView, type SharingView } from '@/server/circle-sharing-view';
import {
  parseInvitePreview,
  toCircleListItem,
  toCircleView,
  type CircleListItem,
  type CircleView,
  type InvitePreview,
} from '@/server/circles-view';
import { HabitError } from '@/server/habits';

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
  const rows = need(await supabase.rpc('my_circles'));

  return rows.map(toCircleListItem);
};

/** A circle as the caller may see it. Throws `notAMember` when they are not in it. */
export const getCircle = async (circleId: string): Promise<CircleView> => {
  await connection();
  const supabase = await createSupabaseServerClient();

  return toCircleView(need(await supabase.rpc('circle_overview', { p_circle: circleId })));
};

/** What I share with one circle: my habits, their levels, the per-person overrides, and the pause switch. */
export const getSharing = async (circleId: string): Promise<SharingView> => {
  await connection();
  const user = await getUser();

  if (!user) {
    throw new HabitError('signIn');
  }

  const supabase = await createSupabaseServerClient();

  if (!need(await supabase.rpc('is_circle_member', { p_circle: circleId }))) {
    throw new HabitError('notAMember');
  }

  const [habits, shares, overrides, profile] = await Promise.all([
    supabase.from('habits').select('id, name, icon').is('archived_at', null).order('created_at'),
    supabase.from('habit_shares').select('habit_id, level, label, shows_misses').eq('circle_id', circleId),
    supabase.from('habit_share_overrides').select('habit_id, viewer_id, level, label').eq('circle_id', circleId),
    supabase.from('profiles').select('circles_paused').eq('user_id', user.id).single(),
  ]);

  return toSharingView(need(habits), need(shares), need(overrides), need(profile).circles_paused);
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

  return parseInvitePreview(need(await supabase.rpc('circle_invite_preview', { p_token: token })));
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

/** A pair: a circle for two. The invite link is made as for any circle. */
export const createPair = async (): Promise<string> => {
  const supabase = await createSupabaseServerClient();

  return need(await supabase.rpc('create_pair'));
};

/** Your own Closer switch for a pair. It is on for both only when both have turned it on. */
export const setCloser = async (circleId: string, on: boolean): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(await supabase.rpc('set_closer', { p_circle: circleId, p_on: on }));
};

/** Whether this partner is shown a habit's off days (a habit shared at Everything in a pair). */
export const setShareMisses = async (habitId: string, circleId: string, on: boolean): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(await supabase.rpc('set_share_misses', { p_habit: habitId, p_circle: circleId, p_on: on }));
};

/** Your own colour for a circle, and whether it is pinned to the top of your list. Friends never see either. */
export const setCircleLook = async (circleId: string, color: CircleColor, pinned: boolean): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(await supabase.rpc('set_circle_look', { p_circle: circleId, p_color: color, p_pinned: pinned }));
};

/** An emoji on a friend's day (their own today or the six days before), or taking it back. */
export const reactTo = async (
  circleId: string,
  toUser: string,
  forDate: string,
  emoji: Reaction,
  on: boolean,
): Promise<void> => {
  const supabase = await createSupabaseServerClient();

  check(await supabase.rpc('react', { p_circle: circleId, p_to: toUser, p_for: forDate, p_emoji: emoji, p_on: on }));
};
