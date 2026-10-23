import { addDays, type CalendarDate } from '@/domain/dates';
import type { CircleMemberView } from '@/server/circles-view';

/** One day for one person in the panel: whether they showed up, and, only where allowed, an off day. */
export interface TogetherDay {
  date: CalendarDate;
  showed: boolean;
  /** An off day the partner chose to show (see `missedDays`). Never set on your own row, or when nothing was allowed. */
  off: boolean;
}

export interface TogetherRow {
  userId: string;
  isYou: boolean;
  days: TogetherDay[];
}

export interface Together {
  /** The last seven days, oldest first, ending on your today. */
  days: CalendarDate[];
  /** You first, then your partner. */
  rows: TogetherRow[];
  /** How many of the days both of you showed up. One number, never who did more. */
  both: number;
}

const DAYS = 7;

/**
 * The "Week together" panel of a pair: the last seven days, a row for each of you. It is only for two people. A day
 * shows up when someone had a tick that day on a habit they share with the other; an off day is marked on your
 * partner's row only when they allowed it for the habit and they did nothing else that day.
 */
export const weekTogether = (members: CircleMemberView[], today: CalendarDate): Together | null => {
  if (members.length !== 2) {
    return null;
  }

  const days = Array.from({ length: DAYS }, (_, back) => {
    return addDays(today, back - (DAYS - 1));
  });

  const rows = [...members]
    .sort((a, b) => {
      return Number(b.isYou) - Number(a.isYou);
    })
    .map(({ userId, isYou, showedUpDays, habits }) => {
      const showedUp = new Set(showedUpDays);
      const off = new Set(
        isYou
          ? []
          : habits.flatMap(({ missed }) => {
              return missed ?? [];
            }),
      );

      return {
        userId,
        isYou,
        days: days.map(date => {
          const showed = showedUp.has(date);

          return { date, showed, off: !showed && off.has(date) };
        }),
      };
    });

  const both = days.filter((_, index) => {
    return rows.every(({ days: theirs }) => {
      return theirs[index].showed;
    });
  }).length;

  return { days, rows, both };
};
