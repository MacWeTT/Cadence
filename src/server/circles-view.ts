// Pure mapping from what `circle_overview` returns to what the Circles screens show. Kept free of `server-only` so it can
// be unit-tested. The database decides what a friend may see; this layer also cuts every fact above the habit's level,
// so a screen can never show more than the level allows, even if a payload carried more.
import { z } from 'zod';
import {
  CIRCLE_COLORS,
  MISS_DAYS,
  REACTIONS,
  isCircleColor,
  reveal,
  type CircleColor,
  type CircleKind,
  type Level,
  type Reaction,
} from '@/domain/circles';
import { missedDays } from '@/domain/circle-misses';
import { isCalendarDate, type CalendarDate } from '@/domain/dates';
import { weekProgress, type WeekProgress } from '@/domain/listing';
import { currentStreak, type Streak } from '@/domain/streaks';
import type { HabitData } from '@/domain/types';
import { toSchedule } from '@/server/habit-view';

const calendarDate = z.string().refine(isCalendarDate);

const dataSchema = z.object({
  start_date: calendarDate,
  schedules: z.array(
    z.object({
      kind: z.string(),
      times_per_week: z.number().nullable(),
      weekdays: z.array(z.number()).nullable(),
      effective_from: calendarDate,
    }),
  ),
  pauses: z.array(z.object({ from: calendarDate, to: calendarDate.nullable() })),
  completions: z.array(calendarDate),
});

const habitSchema = z.object({
  name: z.string().nullable(),
  icon: z.string().nullable(),
  level: z.enum(['done_today', 'streaks', 'everything']),
  done: z.boolean(),
  /** The partner may be shown this habit's off days (a pair, Closer on for both, the owner's tick, Everything). */
  shows_misses: z.boolean(),
  data: dataSchema.optional(),
});

const memberSchema = z.object({
  user_id: z.uuid(),
  tag: z.string(),
  display_name: z.string().nullable(),
  is_you: z.boolean(),
  is_owner: z.boolean(),
  paused: z.boolean(),
  today: calendarDate,
  week_starts_on: z.union([z.literal(1), z.literal(7)]),
  allow_cheers: z.boolean(),
  in_week: z.boolean(),
  closer: z.boolean(),
  /** For a pair: the days in the last week this person showed up (days only; never which habit). */
  showed_up_days: z.array(calendarDate),
  avatar_kind: z.enum(['google', 'character', 'emoji', 'initial']),
  avatar_value: z.string().nullable(),
  avatar_color: z.string().nullable(),
  avatar_url: z.string().nullable(),
  showed_up_week: z.boolean(),
  habits: z.array(habitSchema),
  reactions: z.array(z.object({ user_id: z.uuid(), tag: z.string(), date: calendarDate, emoji: z.enum(REACTIONS) })),
  cheers_today: z.array(z.object({ user_id: z.uuid(), tag: z.string() })).nullable(),
  cheered_by_you: z.boolean().nullable(),
});

const overviewSchema = z.object({
  circle: z.object({
    id: z.uuid(),
    name: z.string(),
    is_owner: z.boolean(),
    week_ticks: z.number(),
    color: z.enum(CIRCLE_COLORS),
    pinned: z.boolean(),
    kind: z.enum(['group', 'pair']),
    closer_active: z.boolean(),
  }),
  members: z.array(memberSchema),
});

type MemberPayload = z.infer<typeof memberSchema>;
type HabitPayload = z.infer<typeof habitSchema>;

/** One habit a friend shares with you, with only what its level allows. */
export interface SharedHabitView {
  /** Null when the owner shows the emoji only, or "a habit". */
  name: string | null;
  /** Null when the owner shows "a habit". */
  icon: string | null;
  level: Exclude<Level, 'hidden' | 'showed_up'>;
  /** The partner may see this habit's off days. Always false outside a pair with Closer on. */
  showsMisses: boolean;
  /** The off days, only when `showsMisses`; otherwise null, and no screen works one out. */
  missed: CalendarDate[] | null;
  /** Done on the owner's today. */
  done: boolean;
  /** At Streaks and Everything, and only above zero. */
  streak: Streak | null;
  /** At Streaks and Everything, for a weekly habit. */
  week: WeekProgress | null;
  /** At Everything only: the dates ticked, oldest first, for the heatmap. */
  ticks?: CalendarDate[];
}

export interface AvatarView {
  kind: 'google' | 'character' | 'emoji' | 'initial';
  value: string | null;
  color: string | null;
  url: string | null;
}

export interface CircleMemberView {
  userId: string;
  tag: string;
  displayName: string | null;
  isYou: boolean;
  /** Started this circle. */
  isOwner: boolean;
  paused: boolean;
  /** The member's own today: a cheer is for this day. */
  today: CalendarDate;
  /** Whether their week counts towards the circle's. */
  inWeek: boolean;
  /** Their own Closer switch (pairs). */
  closer: boolean;
  /** The days of the last week they showed up: only in a pair, empty in a group. */
  showedUpDays: CalendarDate[];
  avatar: AvatarView;
  allowCheers: boolean;
  showedUpWeek: boolean;
  habits: SharedHabitView[];
  /** The reactions on this person's days, from everyone in the circle, for today and the six days before. */
  reactions: { userId: string; tag: string; date: CalendarDate; emoji: Reaction }[];
  /** Who cheered you today: only on your own card. */
  cheersToday: { userId: string; tag: string }[] | null;
  /** Whether you cheered this person today: not on your own card. */
  cheeredByYou: boolean | null;
}

/** One of the person's circles, for the list. */
export interface CircleListItem {
  id: string;
  name: string;
  isOwner: boolean;
  /** How many people are in it, the person included. */
  memberCount: number;
  /** The person's own colour for it, and whether they pinned it. */
  color: CircleColor;
  pinned: boolean;
  kind: CircleKind;
  /** For a pair: the partner, once there is one. */
  partnerName: string | null;
  partnerTag: string | null;
}

export interface CircleView {
  id: string;
  name: string;
  /** The viewer's own colour for the circle, and whether they pinned it. */
  color: CircleColor;
  pinned: boolean;
  kind: CircleKind;
  /** A pair whose two people have both turned Closer on. */
  closerActive: boolean;
  isOwner: boolean;
  /** This week's check-ins across the circle: one number, never per person. */
  weekTicks: number;
  members: CircleMemberView[];
}

const habitDataOf = (data: z.infer<typeof dataSchema>): HabitData => {
  const { start_date, schedules, pauses, completions } = data;

  return { startDate: start_date, schedules: schedules.map(toSchedule), pauses, completions: new Set(completions) };
};

/** A shared habit as the screens see it. The streak and week are worked out here, with the owner's own day and week. */
const toSharedHabit = (habit: HabitPayload, member: MemberPayload, pair: boolean): SharedHabitView => {
  const { name, icon, level, done, data, shows_misses } = habit;
  const view: SharedHabitView = { name, icon, level, done, showsMisses: false, missed: null, streak: null, week: null };
  const { streak: showsStreak, history: showsHistory } = reveal(level);

  if (!data || !showsStreak) {
    return view;
  }

  const { today, week_starts_on } = member;
  const ctx = { today, weekStartsOn: week_starts_on };
  const habitData = habitDataOf(data);
  const streak = currentStreak(habitData, ctx);

  view.streak = streak.count > 0 ? streak : null;
  view.week = weekProgress(habitData, today, ctx);

  if (showsHistory) {
    view.ticks = [...data.completions].sort();
  }

  // Off days: only for a partner, with Closer on for both, for a habit the owner ticked at Everything. The database says
  // so with `shows_misses`; the circle's own state and the level are checked again here, so nothing slips through.
  if (pair && shows_misses && level === 'everything') {
    view.showsMisses = true;
    view.missed = missedDays(habitData, ctx, MISS_DAYS);
  }

  return view;
};

const toMember = (member: MemberPayload, pair: boolean): CircleMemberView => {
  const { user_id, tag, display_name, is_you, is_owner, paused, allow_cheers, showed_up_week, habits } = member;
  const { cheers_today, today, in_week, reactions, closer, showed_up_days } = member;
  const { avatar_kind, avatar_value, avatar_color, avatar_url, cheered_by_you } = member;

  return {
    userId: user_id,
    tag,
    displayName: display_name,
    isYou: is_you,
    isOwner: is_owner,
    paused,
    today,
    inWeek: in_week,
    closer,
    showedUpDays: showed_up_days,
    avatar: { kind: avatar_kind, value: avatar_value, color: avatar_color, url: avatar_url },
    allowCheers: allow_cheers,
    showedUpWeek: showed_up_week,
    habits: habits.map(habit => {
      return toSharedHabit(habit, member, pair);
    }),
    reactions: reactions.map(({ user_id, tag: reactionTag, date, emoji }) => {
      return { userId: user_id, tag: reactionTag, date, emoji };
    }),
    cheersToday:
      cheers_today?.map(({ user_id: userId, tag: cheerTag }) => {
        return { userId, tag: cheerTag };
      }) ?? null,
    cheeredByYou: cheered_by_you,
  };
};

/** Reads `circle_overview`'s answer. Throws when it is not the shape the database promises. */
export const toCircleView = (payload: unknown): CircleView => {
  const { circle, members } = overviewSchema.parse(payload);
  const { id, name, is_owner, week_ticks, color, pinned, kind, closer_active } = circle;
  const pair = kind === 'pair' && closer_active;

  return {
    id,
    name,
    color,
    pinned,
    kind,
    closerActive: closer_active,
    isOwner: is_owner,
    weekTicks: week_ticks,
    members: members.map(member => {
      return toMember(member, pair);
    }),
  };
};

const previewSchema = z.object({
  name: z.string(),
  kind: z.enum(['group', 'pair']),
  full: z.boolean(),
  members: z.array(z.object({ tag: z.string(), display_name: z.string().nullable() })),
});

/** What an invite opens, for the "Join this circle?" screen: the circle's name, whether it is full, and who is in it. */
export type InvitePreview = z.infer<typeof previewSchema>;

/** Reads `circle_invite_preview`'s answer. Throws when it is not the shape the database promises. */
export const parseInvitePreview = (payload: unknown): InvitePreview => {
  return previewSchema.parse(payload);
};

/** One row of `my_circles`, as the list shows it. A colour or kind this code does not know is read as the safest one. */
export const toCircleListItem = (row: {
  id: string;
  name: string;
  is_owner: boolean;
  member_count: number;
  color: string;
  pinned: boolean;
  kind: string;
  partner_name: string | null;
  partner_tag: string | null;
}): CircleListItem => {
  const { id, name, is_owner, member_count, color, pinned, kind, partner_name, partner_tag } = row;

  return {
    id,
    name,
    isOwner: is_owner,
    memberCount: member_count,
    color: isCircleColor(color) ? color : 'moss',
    pinned,
    kind: kind === 'pair' ? 'pair' : 'group',
    partnerName: partner_name,
    partnerTag: partner_tag,
  };
};
