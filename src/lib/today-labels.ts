import type { WeekProgress } from '@/domain/listing';
import type { Streak } from '@/domain/streaks';

export function streakLabel(streak: Streak): string {
  if (streak.unit === 'week') return `${streak.count} week streak`;
  return `🔥 ${streak.count} ${streak.count === 1 ? 'day' : 'days'}`;
}

export function weekLabel(week: WeekProgress): string {
  return week.goalMet ? 'Goal met' : `${week.done} of ${week.target} this week`;
}

/** A streak length on its own: "3 days", "1 week". */
export function streakLength(streak: Streak): string {
  return `${streak.count} ${streak.unit}${streak.count === 1 ? '' : 's'}`;
}
