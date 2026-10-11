// Pure helpers for the server layer. Kept free of `server-only` imports so they can be unit-tested.
import type { CalendarDate } from '@/domain/dates';
import { scheduleOn } from '@/domain/schedule';
import type { DesiredSchedule } from '@/domain/schedule-change';
import type { Schedule, Weekday } from '@/domain/types';
import { isValidTimeZone, type HabitInput } from '@/lib/habit-schema';
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
  /** Web addresses opened together from the habit's row. */
  links: string[];
}

export const toSchedule = ({ kind, times_per_week, weekdays, effective_from }: ScheduleRow): Schedule => {
  switch (kind) {
    case 'weekly_count':
      return { kind, timesPerWeek: times_per_week ?? 1, effectiveFrom: effective_from };
    case 'weekdays':
      return { kind, days: [...(weekdays ?? [])].sort() as Weekday[], effectiveFrom: effective_from };
    case 'optional':
      return { kind, effectiveFrom: effective_from };
    default:
      return { kind: 'daily', effectiveFrom: effective_from };
  }
};

/** The schedule a habit form asks for. */
export const toDesired = ({
  kind,
  timesPerWeek,
  weekdays,
}: Pick<HabitInput, 'kind' | 'timesPerWeek' | 'weekdays'>): DesiredSchedule => {
  switch (kind) {
    case 'weekly_count':
      return { kind, timesPerWeek: timesPerWeek ?? 1 };
    case 'weekdays':
      return { kind, days: [...(weekdays ?? [])].sort() as Weekday[] };
    default:
      return { kind };
  }
};

/**
 * A schedule as the arguments of the database functions, `null` for the parts it does not use. The generated argument
 * types are non-null, but the functions accept null, hence the cast.
 */
export const scheduleArgs = (schedule: Schedule | null) => {
  const times = schedule?.kind === 'weekly_count' ? schedule : null;
  const days = schedule?.kind === 'weekdays' ? schedule : null;

  return {
    p_kind: schedule?.kind ?? null,
    p_times_per_week: times?.timesPerWeek ?? null,
    p_weekdays: days?.days ?? null,
  } as { p_kind: string; p_times_per_week: number; p_weekdays: number[] };
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
  const { id, name, description, icon, color: storedColor, start_date, archived_at, links } = habit;

  return {
    id,
    name,
    description,
    icon,
    color: toColorKey(storedColor),
    startDate: start_date,
    archivedAt: archived_at,
    // A start date moved before every row is covered by the earliest schedule (see scheduleFor in the domain).
    schedule: scheduleOn(schedules, today) ?? schedules[0],
    pendingSchedule:
      schedules.find(s => {
        return s.effectiveFrom > today;
      }) ?? null,
    hasCompletions,
    links,
  };
};

/** Save the browser's timezone only while the profile still has the UTC default. */
export const shouldSyncTimezone = (current: string, browser: string): boolean => {
  return current === 'UTC' && browser !== 'UTC' && isValidTimeZone(browser);
};
