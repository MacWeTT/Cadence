import { describe, expect, it } from 'vitest';
import { LATEST_VERSION, migrate } from '@/data/local/migrations';
import { memorySql } from '@tests/unit/data/local/memory-sql';

const tables = async (sql: ReturnType<typeof memorySql>): Promise<string[]> => {
  const rows = await sql.select<{ name: string }>("select name from sqlite_master where type = 'table' order by name");

  return rows.map(({ name }) => {
    return name;
  });
};

const version = async (sql: ReturnType<typeof memorySql>): Promise<number> => {
  const [row] = await sql.select<{ user_version: number }>('pragma user_version');

  return row.user_version;
};

describe('the local database migrations', () => {
  it('makes every table of a new file and records the version', async () => {
    const sql = memorySql();

    await migrate(sql);

    expect(await tables(sql)).toEqual(
      expect.arrayContaining([
        'habits',
        'habit_schedules',
        'habit_archive_periods',
        'habit_completions',
        'profile',
        'focus_sessions',
      ]),
    );
    expect(await version(sql)).toBe(LATEST_VERSION);
  });

  it('starts with the one profile row and nothing else', async () => {
    const sql = memorySql();

    await migrate(sql);

    expect(await sql.select('select id, timezone, week_starts_on from profile')).toEqual([
      { id: 1, timezone: 'UTC', week_starts_on: 1 },
    ]);
    expect(await sql.select('select count(*) as n from habits')).toEqual([{ n: 0 }]);
  });

  it('leaves a file that is up to date alone, so it is safe to run on every start', async () => {
    const sql = memorySql();

    await migrate(sql);
    await sql.batch([{ query: "update profile set display_name = 'Mac' where id = 1" }]);
    await migrate(sql);

    expect(await sql.select('select display_name from profile')).toEqual([{ display_name: 'Mac' }]);
  });

  it('refuses a file made by a newer version of the app, rather than guess at it', async () => {
    const sql = memorySql();

    await migrate(sql);
    await sql.batch([{ query: `pragma user_version = ${LATEST_VERSION + 1}` }]);

    await expect(migrate(sql)).rejects.toThrow(/newer/i);
  });

  it('keeps the rules the server keeps: one tick per habit and day, one open pause, ticks go with their habit', async () => {
    const sql = memorySql();

    await migrate(sql);
    await sql.batch([
      {
        query:
          "insert into habits (id, name, icon, color, start_date, created_at, updated_at) values ('h1', 'Read', 'r', 'moss', '2026-10-01', 'x', 'x')",
      },
      {
        query:
          "insert into habit_completions (id, habit_id, completion_date, created_at) values ('c1', 'h1', '2026-10-02', 'x')",
      },
    ]);

    await expect(
      sql.batch([
        {
          query:
            "insert into habit_completions (id, habit_id, completion_date, created_at) values ('c2', 'h1', '2026-10-02', 'x')",
        },
      ]),
    ).rejects.toThrow();

    await sql.batch([
      { query: "insert into habit_archive_periods (id, habit_id, archived_on) values ('p1', 'h1', '2026-10-03')" },
    ]);

    await expect(
      sql.batch([
        { query: "insert into habit_archive_periods (id, habit_id, archived_on) values ('p2', 'h1', '2026-10-04')" },
      ]),
    ).rejects.toThrow();

    await sql.batch([{ query: "delete from habits where id = 'h1'" }]);

    expect(await sql.select('select count(*) as n from habit_completions')).toEqual([{ n: 0 }]);
    expect(await sql.select('select count(*) as n from habit_archive_periods')).toEqual([{ n: 0 }]);
  });
});
