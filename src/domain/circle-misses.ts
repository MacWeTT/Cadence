import { addDays, weekEnd, weekStart, type CalendarDate } from '@/domain/dates';
import { dayStatus, weekStatus } from '@/domain/status';
import type { Ctx, HabitData } from '@/domain/types';

/**
 * The off days of a habit in the last `days` days (not counting today, which is not over), oldest first. A daily or
 * fixed-day habit gives each expected day that went unticked; a weekly habit gives the last day of a week that ended
 * without its goal. It uses the same day and week rules as the rest of the app (`docs/rules.md`), so paused days, days
 * before the habit started and ticks on any day are judged as they are everywhere else.
 *
 * This is only for a partner who was allowed to see it: Closer on for both, and the owner's tick for this habit. The
 * screens never call it otherwise.
 */
export const missedDays = (h: HabitData, ctx: Ctx, days: number): CalendarDate[] => {
  const { today, weekStartsOn } = ctx;
  const missed: CalendarDate[] = [];

  for (let back = days; back >= 1; back--) {
    const date = addDays(today, -back);
    const dayMissed = dayStatus(h, date, ctx) === 'missed';
    const weekMissed =
      date === weekEnd(date, weekStartsOn) && weekStatus(h, weekStart(date, weekStartsOn), ctx).status === 'missed';

    if (dayMissed || weekMissed) {
      missed.push(date);
    }
  }

  return missed;
};
