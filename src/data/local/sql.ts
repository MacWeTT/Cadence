/** One statement and what to put in its `?` places. Values are text, numbers or `null`: never booleans or objects. */
export interface Statement {
  query: string;
  params?: unknown[];
}

/**
 * The desktop app's SQLite file, as the data code sees it. In the app it is the Rust side (`src-tauri/src/db.rs`); in
 * tests it is an in-memory database. Nothing else about the file is visible, so the code above it can be tested alone.
 */
export interface Sql {
  /** Reads rows as objects keyed by column name. */
  select: <T>(query: string, params?: unknown[]) => Promise<T[]>;
  /** Runs the statements one after another in one transaction: all of them happen, or none do. */
  batch: (statements: Statement[]) => Promise<void>;
}

/** Runs a single statement. */
export const execute = (sql: Sql, query: string, params: unknown[] = []): Promise<void> => {
  return sql.batch([{ query, params }]);
};
