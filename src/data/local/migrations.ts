import type { Sql, Statement } from '@/data/local/sql';

/**
 * The local file's schema, one entry per version. It mirrors the server's tables, minus the account (`user_id`) and the
 * database's own rules, which the data code in this folder keeps instead. A released entry is never edited: a change is a
 * new entry, so a file made by an older app is brought forward, never rebuilt.
 */
const MIGRATIONS: string[][] = [
  [
    `create table habits (
      id text primary key,
      user_id text not null default 'local',
      name text not null,
      description text,
      icon text not null,
      color text not null,
      start_date text not null,
      archived_at text,
      links text not null default '[]',
      created_at text not null,
      updated_at text not null
    )`,
    `create table habit_schedules (
      id text primary key,
      habit_id text not null references habits (id) on delete cascade,
      kind text not null,
      times_per_week integer,
      weekdays text,
      effective_from text not null,
      unique (habit_id, effective_from)
    )`,
    `create table habit_archive_periods (
      id text primary key,
      habit_id text not null references habits (id) on delete cascade,
      archived_on text not null,
      restored_on text
    )`,
    'create unique index habit_archive_periods_one_open on habit_archive_periods (habit_id) where restored_on is null',
    `create table habit_completions (
      id text primary key,
      habit_id text not null references habits (id) on delete cascade,
      completion_date text not null,
      created_at text not null,
      unique (habit_id, completion_date)
    )`,
    `create table focus_sessions (
      id text primary key,
      habit_id text not null references habits (id) on delete cascade,
      started_at text not null,
      ended_at text,
      mode text not null,
      plan text,
      skipped_seconds integer not null default 0,
      paused_at text,
      paused_seconds integer not null default 0,
      focus_seconds integer,
      sound_id text
    )`,
    'create unique index focus_sessions_one_running on focus_sessions ((1)) where ended_at is null',
    `create table profile (
      id integer primary key check (id = 1),
      display_name text,
      tag text not null default 'me',
      timezone text not null default 'UTC',
      week_starts_on integer not null default 1,
      avatar_kind text not null default 'google',
      avatar_value text,
      avatar_color text,
      avatar_url text,
      sound_id text not null default 'bell',
      sound_volume real not null default 0.6,
      accent text,
      accent_custom text,
      password_set integer not null default 0
    )`,
    'insert into profile (id) values (1)',
  ],
];

export const LATEST_VERSION = MIGRATIONS.length;

/**
 * Brings the file up to the latest version, on every start. The version lives in the file itself (`user_version`), and
 * each step and its version number go in together, so a step is never half done. A file made by a newer app is refused.
 */
export const migrate = async (sql: Sql): Promise<void> => {
  const [{ user_version: current }] = await sql.select<{ user_version: number }>('pragma user_version');

  if (current > LATEST_VERSION) {
    throw new Error(
      `This file was made by a newer version of Cadence (schema ${current}, this app has ${LATEST_VERSION}).`,
    );
  }

  for (let version = current + 1; version <= LATEST_VERSION; version++) {
    const steps: Statement[] = MIGRATIONS[version - 1].map(query => {
      return { query };
    });

    await sql.batch([...steps, { query: `pragma user_version = ${version}` }]);
  }
};
