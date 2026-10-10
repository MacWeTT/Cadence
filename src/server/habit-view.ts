// Pure helpers for the server layer. Kept free of `server-only` imports so they can be unit-tested.
import type { CalendarDate } from '@/domain/dates';
import { scheduleOn } from '@/domain/schedule';
import type { Schedule } from '@/domain/types';
import { isValidTimeZone } from '@/lib/habit-schema';
import { COLOR_KEYS, type ColorKey } from '@/lib/palette';
import type { Database } from '@/lib/supabase/database.types';

export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type ScheduleRow = Database['public']['Tables']['habit_schedules']['Row'];

export interface HabitListItem {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: ColorKey;
  startDate: CalendarDate;
  archivedAt: string | null;
  schedule: Schedule;
  pendingSchedule: Schedule | null;
  hasCompletions: boolean;
}

export const toSchedule = (row: ScheduleRow): Schedule => {
  return row.kind === 'weekly_count'
    ? { kind: 'weekly_count', timesPerWeek: row.times_per_week ?? 1, effectiveFrom: row.effective_from }
    : { kind: 'daily', effectiveFrom: row.effective_from };
};

/** A stored color, or a known one if the stored value is unexpected. */
export const toColorKey = (value: string): ColorKey => {
  return (COLOR_KEYS as readonly string[]).includes(value) ? (value as ColorKey) : 'moss';
};

export const toListItem = (
  habit: HabitRow,
  scheduleRows: ScheduleRow[],
  hasCompletions: boolean,
  today: CalendarDate,
): HabitListItem => {
  const schedules = scheduleRows.map(toSchedule).sort((a, b) => {
    return a.effectiveFrom.localeCompare(b.effectiveFrom);
  });
  const color = toColorKey(habit.color);

  return {
    id: habit.id,
    name: habit.name,
    description: habit.description,
    icon: habit.icon,
    color,
    startDate: habit.start_date,
    archivedAt: habit.archived_at,
    // A start date moved before every row is covered by the earliest schedule (see scheduleFor in the domain).
    schedule: scheduleOn(schedules, today) ?? schedules[0],
    pendingSchedule:
      schedules.find(s => {
        return s.effectiveFrom > today;
      }) ?? null,
    hasCompletions,
  };
};

/** Save the browser's timezone only while the profile still has the UTC default. */
export const shouldSyncTimezone = (current: string, browser: string): boolean => {
  return current === 'UTC' && browser !== 'UTC' && isValidTimeZone(browser);
};
