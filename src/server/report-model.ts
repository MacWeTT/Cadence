// Pure numbers behind the PDF report. Kept free of `server-only` so it can be unit-tested.
import { addDays, weekStart, type CalendarDate, type WeekStart } from '@/domain/dates';
import { ratio, completionRate } from '@/domain/rates';
import { scheduleFor } from '@/domain/schedule';
import { dayStatus } from '@/domain/status';
import { currentStreak, longestStreak, type Streak } from '@/domain/streaks';
import type { Ctx, HabitData, Schedule, Weekday } from '@/domain/types';
import type { Backup, BackupHabit } from '@/lib/backup-types';
import { COLOR_KEYS, type ColorKey } from '@/lib/palette';

/** How many weeks the heatmap of each habit shows (a year). */
export const HEAT_WEEKS = 52;

export type HeatCell = 'done' | 'missed' | 'none' | 'future';

export interface ReportHabit {
  name: string;
  color: ColorKey;
  /** The schedule in effect today, or the last one a habit that ended had. */
  schedule: Schedule;
  archived: boolean;
  /** `null` for a habit with no expectations (optional). */
  current: Streak | null;
  longest: Streak | null;
  /** Whole percent over the last 30 and 90 days, or `null` when nothing was expected. */
  rate30: number | null;
  rate90: number | null;
  ticks: number;
  focusMinutes: number;
  /** Weeks, oldest first, each of seven days from the week's first day. */
  heat: HeatCell[][];
}

export interface Report {
  name: string;
  today: CalendarDate;
  totals: { habits: number; ticks: number; focusMinutes: number };
  habits: ReportHabit[];
}

const toSchedule = (schedules: BackupHabit['schedules'][number]): Schedule => {
  const { kind, timesPerWeek, weekdays, effectiveFrom } = schedules;

  if (kind === 'weekly_count') {
    return { kind, timesPerWeek: timesPerWeek ?? 1, effectiveFrom };
  }

  if (kind === 'weekdays') {
    return { kind, days: [...(weekdays ?? [])].sort() as Weekday[], effectiveFrom };
  }

  return { kind, effectiveFrom };
};

const toData = (habit: BackupHabit): HabitData => {
  const { startDate, pauses, schedules, ticks } = habit;

  return {
    startDate,
    schedules: schedules.map(toSchedule),
    pauses: pauses.map(({ archivedOn, restoredOn }) => {
      return { from: archivedOn, to: restoredOn };
    }),
    completions: new Set(ticks),
  };
};

const percent = (data: HabitData, days: number, ctx: Ctx): number | null => {
  const { today } = ctx;
  const share = ratio(completionRate(data, addDays(today, -(days - 1)), today, ctx));

  return share === null ? null : Math.round(share * 100);
};

const heatmap = (data: HabitData, ctx: Ctx): HeatCell[][] => {
  const { today, weekStartsOn } = ctx;
  const first = addDays(weekStart(today, weekStartsOn), -7 * (HEAT_WEEKS - 1));

  return Array.from({ length: HEAT_WEEKS }, (_, week) => {
    return Array.from({ length: 7 }, (_, day): HeatCell => {
      const date = addDays(first, week * 7 + day);

      if (date > today) {
        return 'future';
      }

      if (data.completions.has(date)) {
        return 'done';
      }

      return dayStatus(data, date, ctx) === 'missed' ? 'missed' : 'none';
    });
  });
};

const toReportHabit = (habit: BackupHabit, ctx: Ctx): ReportHabit => {
  const { name, color, archivedAt, ticks, schedules, focusSessions } = habit;
  const data = toData(habit);
  const schedule = scheduleFor(data, ctx.today) ?? toSchedule(schedules.at(-1) ?? schedules[0]);
  const expects = schedule.kind !== 'optional';

  return {
    name,
    color: (COLOR_KEYS as readonly string[]).includes(color) ? (color as ColorKey) : 'moss',
    schedule,
    archived: archivedAt !== null,
    current: expects ? currentStreak(data, ctx) : null,
    longest: expects ? longestStreak(data, ctx) : null,
    rate30: expects ? percent(data, 30, ctx) : null,
    rate90: expects ? percent(data, 90, ctx) : null,
    ticks: ticks.length,
    focusMinutes: Math.round(
      focusSessions.reduce((sum, { focusSeconds }) => {
        return sum + focusSeconds;
      }, 0) / 60,
    ),
    heat: heatmap(data, ctx),
  };
};

/** The numbers of the report, from a backup and the account's today: the same streak and rate rules as the app. */
export const buildReport = (backup: Backup, today: CalendarDate, weekStartsOn: WeekStart): Report => {
  const ctx: Ctx = { today, weekStartsOn };
  const { profile, habits: source } = backup;
  const habits = source.map(habit => {
    return toReportHabit(habit, ctx);
  });

  return {
    name: profile.name,
    today,
    totals: {
      habits: habits.length,
      ticks: habits.reduce((sum, { ticks }) => {
        return sum + ticks;
      }, 0),
      focusMinutes: habits.reduce((sum, { focusMinutes }) => {
        return sum + focusMinutes;
      }, 0),
    },
    habits,
  };
};
