import type { CircleView } from '@/server/circles-view';

/** The screen's guess at a sent cheer: that friend shows as cheered today. Your own card is left alone. */
export const withCheered = (view: CircleView, userId: string): CircleView => {
  return {
    ...view,
    members: view.members.map(member => {
      const { userId: id, isYou } = member;

      return id === userId && !isYou ? { ...member, cheeredByYou: true } : member;
    }),
  };
};

/** The guess at `set_circle_prefs`, which are about you: only your own card changes. */
export const withPrefs = (view: CircleView, inWeek: boolean, allowCheers: boolean): CircleView => {
  return {
    ...view,
    members: view.members.map(member => {
      return member.isYou ? { ...member, inWeek, allowCheers } : member;
    }),
  };
};
