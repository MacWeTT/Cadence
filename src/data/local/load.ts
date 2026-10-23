import { todayIn } from '@/domain/dates';
import type { Sql } from '@/data/local/sql';
import { isValidTimeZone } from '@/lib/habit-schema';
import type { HabitEntry } from '@/server/habit-data';
import type { HabitRow, ScheduleRow } from '@/server/habit-view';
import type { Profile } from '@/server/habits';
import type { LoadedHabits } from '@/server/page-data';
import { toHabitData } from '@/server/today-view';

interface HabitSqlRow extends Omit<HabitRow, 'links'> {
  links: string;
}

interface ScheduleSqlRow extends Omit<ScheduleRow, 'weekdays'> {
  weekdays: string | null;
}

interface PeriodRow {
  habit_id: string;
  archived_on: string;
  restored_on: string | null;
}

/** The rows of the habit tables as the server's pure code reads them (the JSON columns opened up). */
export interface HabitRows {
  habits: HabitRow[];
  schedules: ScheduleRow[];
  periods: PeriodRow[];
  /** Tick dates by habit. */
  ticks: Map<string, string[]>;
}

/** The person's timezone, week start and name, and today in that timezone on this device's clock. */
export const getProfile = async (sql: Sql): Promise<Profile> => {
  const [row] = await sql.select<{ timezone: string; week_starts_on: number; display_name: string | null }>(
    'select timezone, week_starts_on, display_name from profile where id = 1',
  );
  const {
    timezone: stored,
    week_starts_on,
    display_name,
  } = row ?? { timezone: 'UTC', week_starts_on: 1, display_name: null };
  const timezone = isValidTimeZone(stored) ? stored : 'UTC';

  return {
    timezone,
    weekStartsOn: week_starts_on === 7 ? 7 : 1,
    today: todayIn(timezone),
    displayName: display_name,
  };
};

export const loadRows = async (sql: Sql): Promise<HabitRows> => {
  const [habits, schedules, periods, completions] = await Promise.all([
    sql.select<HabitSqlRow>('select * from habits order by created_at, id'),
    sql.select<ScheduleSqlRow>('select * from habit_schedules order by effective_from'),
    sql.select<PeriodRow>('select habit_id, archived_on, restored_on from habit_archive_periods order by archived_on'),
    sql.select<{ habit_id: string; completion_date: string }>(
      'select habit_id, completion_date from habit_completions order by habit_id, completion_date',
    ),
  ]);
  const ticks = new Map<string, string[]>();

  for (const { habit_id, completion_date } of completions) {
    ticks.set(habit_id, [...(ticks.get(habit_id) ?? []), completion_date]);
  }

  return {
    habits: habits.map(habit => {
      return { ...habit, links: JSON.parse(habit.links) as string[] };
    }),
    schedules: schedules.map(({ weekdays, ...schedule }) => {
      return { ...schedule, weekdays: weekdays ? (JSON.parse(weekdays) as number[]) : null };
    }),
    periods,
    ticks,
  };
};

/** Every habit (archived ones too) with its schedules, pauses and ticks, in creation order, plus the person's day. */
export const loadHabits = async (sql: Sql): Promise<LoadedHabits & { rows: HabitRows }> => {
  const [profile, rows] = await Promise.all([getProfile(sql), loadRows(sql)]);
  const { today, weekStartsOn } = profile;
  const { habits, schedules, periods, ticks } = rows;

  const entries: HabitEntry[] = habits.map(habit => {
    const { id } = habit;

    return {
      habit,
      data: toHabitData(
        habit,
        schedules.filter(({ habit_id }) => {
          return habit_id === id;
        }),
        periods.filter(({ habit_id }) => {
          return habit_id === id;
        }),
        ticks.get(id) ?? [],
      ),
    };
  });

  return { entries, ctx: { today, weekStartsOn }, profile, rows };
};
