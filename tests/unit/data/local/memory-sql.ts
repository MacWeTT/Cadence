import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { Sql } from '@/data/local/sql';

/** An in-memory SQLite behind the same `Sql` the desktop app uses, so the data code is tested without Tauri. */
export const memorySql = (): Sql & { raw: DatabaseSync } => {
  const raw = new DatabaseSync(':memory:');

  raw.exec('PRAGMA foreign_keys = ON');

  return {
    raw,
    select: <T>(query: string, params: unknown[] = []) => {
      return Promise.resolve(raw.prepare(query).all(...(params as SQLInputValue[])) as T[]);
    },
    batch: statements => {
      raw.exec('BEGIN');

      try {
        for (const { query, params = [] } of statements) {
          raw.prepare(query).run(...(params as SQLInputValue[]));
        }

        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');

        return Promise.reject(error);
      }

      return Promise.resolve();
    },
  };
};
