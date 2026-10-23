import { getProfile } from '@/data/local/load';
import type { Sql } from '@/data/local/sql';
import type { Dirty, RemoteFocus, StepPort } from '@/data/local/step-types';
import type { AccountSettings } from '@/data/local/sync';

export const SETTINGS_COLUMNS =
  'display_name, tag, timezone, week_starts_on, sound_id, sound_volume, accent, accent_custom';

const json = <T>(text: string | null): T | null => {
  return text === null ? null : (JSON.parse(text) as T);
};

interface HabitSqlRow {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  start_date: string;
  links: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

const pushHabit = async (sql: Sql, port: StepPort, id: string): Promise<void> => {
  const [habit] = await sql.select<HabitSqlRow>('select * from habits where id = ?', [id]);

  if (!habit) {
    return port.deleteHabit(id);
  }

  const [schedules, pauses] = await Promise.all([
    sql.select<{ kind: string; times_per_week: number | null; weekdays: string | null; effective_from: string }>(
      'select kind, times_per_week, weekdays, effective_from from habit_schedules where habit_id = ? order by effective_from',
      [id],
    ),
    sql.select<{ archived_on: string; restored_on: string | null }>(
      'select archived_on, restored_on from habit_archive_periods where habit_id = ? order by archived_on',
      [id],
    ),
  ]);
  const { name, description, icon, color, start_date, links, created_at, updated_at, archived_at } = habit;

  return port.putHabit({
    id,
    name,
    description,
    icon,
    color,
    startDate: start_date,
    links: JSON.parse(links) as string[],
    createdAt: created_at,
    updatedAt: updated_at,
    archivedAt: archived_at,
    schedules: schedules.map(({ kind, times_per_week, weekdays, effective_from }) => {
      return { kind, timesPerWeek: times_per_week, weekdays: json<number[]>(weekdays), effectiveFrom: effective_from };
    }),
    pauses: pauses.map(({ archived_on, restored_on }) => {
      return { archivedOn: archived_on, restoredOn: restored_on };
    }),
  });
};

const pushFocus = async (sql: Sql, port: StepPort, id: string): Promise<void> => {
  const [row] = await sql.select<Omit<RemoteFocus, 'plan'> & { plan: string | null }>(
    'select * from focus_sessions where id = ? and ended_at is not null',
    [id],
  );

  if (!row) {
    return port.deleteFocus(id);
  }

  const { plan } = row;

  return port.putFocus({ ...row, plan: json(plan) });
};

const pushTick = async (sql: Sql, port: StepPort, id: string): Promise<void> => {
  const [habitId, date] = id.split('|');
  const [{ today }, found] = await Promise.all([
    getProfile(sql),
    sql.select('select 1 from habit_completions where habit_id = ? and completion_date = ?', [habitId, date]),
  ]);

  return port.setTick(habitId, date, found.length > 0, today);
};

/** Sends one marked record as it is on the PC now: its current state, or its removal when it is gone. */
export const pushOne = async (sql: Sql, port: StepPort, mark: Dirty): Promise<void> => {
  const { kind, id } = mark;

  if (kind === 'habit') {
    return pushHabit(sql, port, id);
  }

  if (kind === 'focus') {
    return pushFocus(sql, port, id);
  }

  if (kind === 'tick') {
    return pushTick(sql, port, id);
  }

  const [settings] = await sql.select<AccountSettings>(`select ${SETTINGS_COLUMNS} from profile where id = 1`);

  return port.saveSettings(settings);
};
