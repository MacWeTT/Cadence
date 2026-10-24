import type { Sql, Statement } from '@/data/local/sql';
import { SETTINGS_COLUMNS, fromLocalRow, toLocalValue } from '@/data/local/settings-columns';
import type { Dirty, RemoteHabit, RemoteState } from '@/data/local/step-types';
import type { AccountSettings } from '@/data/local/sync';

/** What the PC's file holds, for comparing with the account: ids only, the marks of unsent changes, and the settings. */
export interface LocalSnapshot {
  habits: { id: string; updated_at: string }[];
  ticks: { habit_id: string; completion_date: string }[];
  focus: { id: string }[];
  marks: Dirty[];
  settings: AccountSettings;
}

export const loadLocal = async (sql: Sql): Promise<LocalSnapshot> => {
  const [habits, ticks, focus, marks, [settingsRow]] = await Promise.all([
    sql.select<{ id: string; updated_at: string }>('select id, updated_at from habits'),
    sql.select<{ habit_id: string; completion_date: string }>(
      'select habit_id, completion_date from habit_completions',
    ),
    sql.select<{ id: string }>('select id from focus_sessions where ended_at is not null'),
    sql.select<Dirty>('select kind, id, seq from dirty'),
    sql.select<Record<string, unknown>>(`select ${SETTINGS_COLUMNS} from profile where id = 1`),
  ]);

  return { habits, ticks, focus, marks, settings: fromLocalRow(settingsRow) };
};

const newer = (a: string, b: string): boolean => {
  return Date.parse(a) > Date.parse(b);
};

const iso = (value: string): string => {
  return new Date(value).toISOString();
};

const tickKey = ({ habit_id, completion_date }: { habit_id: string; completion_date: string }): string => {
  return `${habit_id}|${completion_date}`;
};

const CHUNK = 400;

const upsertHabit = (habit: RemoteHabit): Statement[] => {
  const { id, name, description, icon, color, start_date, links, created_at, updated_at, archived_at } = habit;
  const { schedules, pauses } = habit;

  return [
    {
      query: `insert into habits (id, name, description, icon, color, start_date, archived_at, links, created_at, updated_at)
              values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              on conflict (id) do update set name = excluded.name, description = excluded.description, icon = excluded.icon,
                color = excluded.color, start_date = excluded.start_date, archived_at = excluded.archived_at,
                links = excluded.links, updated_at = excluded.updated_at`,
      params: [
        id,
        name,
        description,
        icon,
        color,
        start_date,
        archived_at ? iso(archived_at) : null,
        JSON.stringify(links),
        iso(created_at),
        iso(updated_at),
      ],
    },
    { query: 'delete from habit_schedules where habit_id = ?', params: [id] },
    ...schedules.map(({ kind, times_per_week, weekdays, effective_from }) => {
      return {
        query:
          'insert into habit_schedules (id, habit_id, kind, times_per_week, weekdays, effective_from) values (?, ?, ?, ?, ?, ?)',
        params: [
          crypto.randomUUID(),
          id,
          kind,
          times_per_week,
          weekdays ? JSON.stringify(weekdays) : null,
          effective_from,
        ],
      };
    }),
    { query: 'delete from habit_archive_periods where habit_id = ?', params: [id] },
    ...pauses.map(({ archived_on, restored_on }) => {
      return {
        query: 'insert into habit_archive_periods (id, habit_id, archived_on, restored_on) values (?, ?, ?, ?)',
        params: [crypto.randomUUID(), id, archived_on, restored_on],
      };
    }),
  ];
};

const habitStatements = (remote: RemoteState, local: LocalSnapshot, held: Set<string>): Statement[] => {
  const statements: Statement[] = [];
  const { habits: remoteHabits } = remote;
  const localUpdated = new Map(
    local.habits.map(({ id, updated_at }) => {
      return [id, updated_at];
    }),
  );
  const remoteIds = new Set(
    remoteHabits.map(({ id }) => {
      return id;
    }),
  );

  for (const habit of remoteHabits) {
    const { id, updated_at } = habit;
    const seen = localUpdated.get(id);

    if (!held.has(`habit:${id}`) && (seen === undefined || newer(updated_at, seen))) {
      statements.push(...upsertHabit(habit));
    }
  }

  for (const id of localUpdated.keys()) {
    if (!remoteIds.has(id) && !held.has(`habit:${id}`)) {
      statements.push({ query: 'delete from habits where id = ?', params: [id] });
    }
  }

  return statements;
};

const tickStatements = (remote: RemoteState, local: LocalSnapshot, held: Set<string>): Statement[] => {
  const statements: Statement[] = [];
  const { ticks, habits } = remote;
  const localTicks = new Set(local.ticks.map(tickKey));
  const remoteTicks = new Set(ticks.map(tickKey));
  const remoteHabits = new Set(
    habits.map(({ id }) => {
      return id;
    }),
  );
  const adds = [...remoteTicks].filter(key => {
    return !localTicks.has(key) && !held.has(`tick:${key}`);
  });
  const removes = [...localTicks].filter(key => {
    const [habitId] = key.split('|');

    return !remoteTicks.has(key) && !held.has(`tick:${key}`) && remoteHabits.has(habitId);
  });

  for (let from = 0; from < adds.length; from += CHUNK) {
    const keys = adds.slice(from, from + CHUNK);

    statements.push({
      query: `insert or ignore into habit_completions (id, habit_id, completion_date, created_at) values ${keys
        .map(() => {
          return '(?, ?, ?, ?)';
        })
        .join(', ')}`,
      params: keys.flatMap(key => {
        const [habitId, date] = key.split('|');

        return [crypto.randomUUID(), habitId, date, new Date().toISOString()];
      }),
    });
  }

  for (const key of removes) {
    const [habitId, date] = key.split('|');

    statements.push({
      query: 'delete from habit_completions where habit_id = ? and completion_date = ?',
      params: [habitId, date],
    });
  }

  return statements;
};

const focusStatements = (remote: RemoteState, local: LocalSnapshot, held: Set<string>): Statement[] => {
  const statements: Statement[] = [];
  const { focus, habits } = remote;
  const localIds = new Set(
    local.focus.map(({ id }) => {
      return id;
    }),
  );
  const remoteIds = new Set(
    focus.map(({ id }) => {
      return id;
    }),
  );
  const remoteHabits = new Set(
    habits.map(({ id }) => {
      return id;
    }),
  );

  for (const session of focus) {
    const { id, habit_id, started_at, ended_at, mode, plan, skipped_seconds, paused_seconds, focus_seconds, sound_id } =
      session;

    if (!localIds.has(id) && !held.has(`focus:${id}`) && remoteHabits.has(habit_id)) {
      statements.push({
        query: `insert or ignore into focus_sessions
                (id, habit_id, started_at, ended_at, mode, plan, skipped_seconds, paused_seconds, focus_seconds, sound_id)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          id,
          habit_id,
          iso(started_at),
          iso(ended_at),
          mode,
          plan ? JSON.stringify(plan) : null,
          skipped_seconds,
          paused_seconds,
          focus_seconds,
          sound_id,
        ],
      });
    }
  }

  for (const id of localIds) {
    if (!remoteIds.has(id) && !held.has(`focus:${id}`)) {
      statements.push({ query: 'delete from focus_sessions where id = ? and ended_at is not null', params: [id] });
    }
  }

  return statements;
};

const settingsStatements = (remote: RemoteState, local: LocalSnapshot, held: Set<string>): Statement[] => {
  const { settings: theirs } = remote;
  const { settings: mine } = local;
  const changed = (Object.keys(theirs) as (keyof AccountSettings)[]).filter(key => {
    return theirs[key] !== mine[key];
  });

  if (held.has('profile:1') || changed.length === 0) {
    return [];
  }

  return [
    {
      query: `update profile set ${changed
        .map(key => {
          return `${key} = ?`;
        })
        .join(', ')} where id = 1`,
      params: changed.map(key => {
        return toLocalValue(theirs[key]);
      }),
    },
  ];
};

/**
 * What to write on the PC to bring in what changed on the account, leaving alone every record the PC changed and has not
 * sent yet (those are in `marks`). A record the account no longer has is removed; the newest edit of a habit wins.
 */
export const pullStatements = (remote: RemoteState, local: LocalSnapshot): Statement[] => {
  const held = new Set(
    local.marks.map(({ kind, id }) => {
      return `${kind}:${id}`;
    }),
  );

  return [
    ...habitStatements(remote, local, held),
    ...tickStatements(remote, local, held),
    ...focusStatements(remote, local, held),
    ...settingsStatements(remote, local, held),
  ];
};
