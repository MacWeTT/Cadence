import type { CircleColor, Reaction } from '@/domain/circles';
import type { CalendarDate } from '@/domain/dates';
import type { CircleView } from '@/server/circles-view';

/** The guess at `set_circle_prefs`, which are about you: only your own card changes. */
export const withPrefs = (view: CircleView, inWeek: boolean, allowCheers: boolean): CircleView => {
  return {
    ...view,
    members: view.members.map(member => {
      return member.isYou ? { ...member, inWeek, allowCheers } : member;
    }),
  };
};

interface ReactionChange {
  /** You, and your tag, so the guess can show your reaction before the server answers. */
  me: string;
  myTag: string;
  toUser: string;
  date: CalendarDate;
  emoji: Reaction;
  on: boolean;
}

/** The guess at `react`: your reaction appears on that friend's day, or goes. Nobody else's is touched. */
export const withReaction = (view: CircleView, change: ReactionChange): CircleView => {
  const { me, myTag, toUser, date, emoji, on } = change;

  return {
    ...view,
    members: view.members.map(member => {
      const { userId, reactions } = member;

      if (userId !== toUser) {
        return member;
      }

      const others = reactions.filter(({ userId: from, date: on, emoji: gave }) => {
        return !(from === me && on === date && gave === emoji);
      });

      return { ...member, reactions: on ? [...others, { userId: me, tag: myTag, date, emoji }] : others };
    }),
  };
};

/** The guess at `set_circle_look`: your own colour and pin for the circle. */
export const withLook = (view: CircleView, color: CircleColor, pinned: boolean): CircleView => {
  return { ...view, color, pinned };
};
