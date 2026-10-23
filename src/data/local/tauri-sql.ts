import { invoke } from '@tauri-apps/api/core';
import type { Sql } from '@/data/local/sql';

/** The app's SQLite file, reached through the two commands in `src-tauri/src/db.rs`. Only works inside the desktop app. */
export const tauriSql: Sql = {
  select: <T>(query: string, params: unknown[] = []) => {
    return invoke<T[]>('sql_select', { query, params });
  },
  batch: statements => {
    return invoke<void>('sql_batch', {
      statements: statements.map(({ query, params = [] }) => {
        return { query, params };
      }),
    });
  },
};
