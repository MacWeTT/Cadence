import type { WeekProgress } from '@/domain/listing';
import type { Streak } from '@/domain/streaks';
import { msg, type Msg } from './message';

/** "🔥 3 days" for a daily habit, "4 week streak" for a weekly one. */
export const streakMsg = (streak: Streak): Msg => {
  return msg(streak.unit === 'week' ? 'labels.streak.weeks' : 'labels.streak.days', { count: streak.count });
};

/** "1 of 3 this week", or "Goal met". */
export const weekMsg = (week: WeekProgress): Msg => {
  return week.goalMet
    ? msg('labels.week.goalMet')
    : msg('labels.week.progress', { done: week.done, target: week.target });
};

/** A streak length on its own: "3 days", "1 week". */
export const streakLengthMsg = (streak: Streak): Msg => {
  return msg(streak.unit === 'week' ? 'labels.streak.lengthWeeks' : 'labels.streak.lengthDays', {
    count: streak.count,
  });
};
