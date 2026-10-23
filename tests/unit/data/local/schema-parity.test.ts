import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrate } from '@/data/local/migrations';
import { memorySql } from '@tests/unit/data/local/memory-sql';

const TYPES = readFileSync('src/lib/supabase/database.types.ts', 'utf8');

/** The tables the PC keeps a copy of, and the columns only one side has (the account on the server, none on the PC). */
const TABLES: Record<string, { serverOnly: string[]; localOnly: string[] }> = {
  habits: { serverOnly: [], localOnly: [] },
  habit_schedules: { serverOnly: [], localOnly: [] },
  habit_archive_periods: { serverOnly: [], localOnly: [] },
  habit_completions: { serverOnly: [], localOnly: [] },
  focus_sessions: { serverOnly: ['user_id'], localOnly: [] },
};

const serverColumns = (table: string): string[] => {
  const block = TYPES.split(`"${table}": {`)[1];
  const row = block.split('Row: {')[1].split('}')[0];

  return [...row.matchAll(/"(\w+)":/g)].map(([, name]) => {
    return name;
  });
};

describe('the local file and the server keep the same columns', () => {
  for (const [table, { serverOnly, localOnly }] of Object.entries(TABLES)) {
    it(`${table}: a column added on one side is added on the other (or listed here with why not)`, async () => {
      const sql = memorySql();

      await migrate(sql);

      const local = (await sql.select<{ name: string }>(`select name from pragma_table_info('${table}')`)).map(
        ({ name }) => {
          return name;
        },
      );
      const server = serverColumns(table);

      expect(
        server.filter(c => {
          return !local.includes(c) && !serverOnly.includes(c);
        }),
      ).toEqual([]);
      expect(
        local.filter(c => {
          return !server.includes(c) && !localOnly.includes(c);
        }),
      ).toEqual([]);
    });
  }
});
