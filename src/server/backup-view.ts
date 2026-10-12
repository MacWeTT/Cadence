// Pure mapping behind the export. Kept free of `server-only` so it can be unit-tested.
import { BACKUP_VERSION, type Backup, type BackupHabit, type ScheduleKind } from '@/lib/backup-types';
import { parsePlan } from '@/server/focus-view';

interface ProfileRow {
  display_name: string | null;
  timezone: string;
  week_starts_on: number;
}

interface HabitRow {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  start_date: string;
  created_at: string;
  archived_at: string | null;
  links: string[];
}

interface ScheduleRow {
  habit_id: string;
  kind: string;
  times_per_week: number | null;
  weekdays: number[] | null;
  effective_from: string;
}

interface TickRow {
  habit_id: string;
  completion_date: string;
}

interface PauseRow {
  habit_id: string;
  archived_on: string;
  restored_on: string | null;
}

interface FocusRow {
  habit_id: string;
  started_at: string;
  ended_at: string | null;
  mode: string;
  plan: unknown;
  skipped_seconds: number;
  focus_seconds: number | null;
}

export interface BackupInput {
  exportedAt: string;
  profile: ProfileRow;
  habits: HabitRow[];
  schedules: ScheduleRow[];
  ticks: TickRow[];
  pauses: PauseRow[];
  focus: FocusRow[];
}

/** A timestamp as an ISO string with milliseconds and a Z, whatever form the database gave it. */
const iso = (value: string): string => {
  return new Date(value).toISOString();
};

const group = <T extends { habit_id: string }>(rows: T[]): Map<string, T[]> => {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const { habit_id } = row;
    const list = map.get(habit_id) ?? [];

    list.push(row);
    map.set(habit_id, list);
  }

  return map;
};

/** The account's rows as one backup. Each habit carries its own records; ids are left out (an import makes new ones). */
export const buildBackup = (input: BackupInput): Backup => {
  const { exportedAt, profile, habits, schedules, ticks, pauses, focus } = input;
  const { display_name, timezone, week_starts_on } = profile;
  const schedulesBy = group(schedules);
  const ticksBy = group(ticks);
  const pausesBy = group(pauses);
  const focusBy = group(focus);

  const mapped: BackupHabit[] = habits.map(
    ({ id, name, description, icon, color, start_date, created_at, archived_at, links }) => {
      return {
        name,
        description,
        icon,
        color,
        startDate: start_date,
        createdAt: iso(created_at),
        links,
        archivedAt: archived_at ? iso(archived_at) : null,
        schedules: (schedulesBy.get(id) ?? [])
          .toSorted((a, b) => {
            return a.effective_from.localeCompare(b.effective_from);
          })
          .map(({ kind, times_per_week, weekdays, effective_from }) => {
            return {
              kind: kind as ScheduleKind,
              timesPerWeek: times_per_week,
              weekdays,
              effectiveFrom: effective_from,
            };
          }),
        ticks: (ticksBy.get(id) ?? [])
          .map(t => {
            return t.completion_date;
          })
          .toSorted(),
        pauses: (pausesBy.get(id) ?? [])
          .toSorted((a, b) => {
            return a.archived_on.localeCompare(b.archived_on);
          })
          .map(({ archived_on, restored_on }) => {
            return { archivedOn: archived_on, restoredOn: restored_on };
          }),
        // A session still running has no end yet: it is not a finished record, so it is left out.
        focusSessions: (focusBy.get(id) ?? [])
          .flatMap(({ started_at, ended_at, mode, plan, skipped_seconds, focus_seconds }) => {
            return ended_at === null
              ? []
              : [
                  {
                    startedAt: iso(started_at),
                    endedAt: iso(ended_at),
                    mode: mode === 'pomodoro' ? ('pomodoro' as const) : ('free' as const),
                    plan: parsePlan(plan),
                    skippedSeconds: skipped_seconds,
                    focusSeconds: focus_seconds ?? 0,
                  },
                ];
          })
          .toSorted((a, b) => {
            return a.startedAt.localeCompare(b.startedAt);
          }),
      };
    },
  );

  return {
    app: 'cadence',
    version: BACKUP_VERSION,
    exportedAt,
    profile: { name: display_name ?? '', timezone, weekStartsOn: week_starts_on === 7 ? 7 : 1 },
    habits: mapped,
  };
};
