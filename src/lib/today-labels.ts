import type { WeekProgress } from '@/domain/listing';
import type { Streak } from '@/domain/streaks';
import { msg, type Msg } from '@/lib/message';

/** "🔥 3 days" for a daily habit, "4 week streak" for a weekly one. */
export const streakMsg = ({ unit, count }: Streak): Msg => {
  return msg(unit === 'week' ? 'labels.streak.weeks' : 'labels.streak.days', { count });
};

/** "1 of 3 this week", or "Goal met". */
export const weekMsg = ({ goalMet, done, target }: WeekProgress): Msg => {
  return goalMet ? msg('labels.week.goalMet') : msg('labels.week.progress', { done, target });
};

/** A streak length on its own: "3 days", "1 week". */
export const streakLengthMsg = ({ unit, count }: Streak): Msg => {
  return msg(unit === 'week' ? 'labels.streak.lengthWeeks' : 'labels.streak.lengthDays', { count });
};
