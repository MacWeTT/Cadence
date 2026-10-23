import { createChanges } from '@/data/local/changes';
import { createAuth, type SignedInUser } from '@/data/local/auth';
import { createAccountChanges, exportFile } from '@/data/local/backup';
import { cloud } from '@/data/local/cloud';
import { createFocusChanges } from '@/data/local/focus-changes';
import { migrate } from '@/data/local/migrations';
import { createProfileChanges } from '@/data/local/profile-changes';
import { createReads } from '@/data/local/reads';
import type { Sql } from '@/data/local/sql';
import { tauriSql } from '@/data/local/tauri-sql';
import { syncTimezone } from '@/data/local/timezone';
import type { DataSource } from '@/data/types';

/** Stands in for every change until it is built (the desktop data source grows a slice at a time). */
const notBuilt = (): Promise<never> => {
  return Promise.reject(new Error('The desktop data source is not built yet.'));
};

/** The file, brought up to the latest schema once, the first time anything asks for it. */
let ready: Promise<void> | null = null;

const opened = (): Promise<void> => {
  ready ??= migrate(tauriSql);

  return ready;
};

const sql: Sql = {
  select: async (query, params) => {
    await opened();

    return tauriSql.select(query, params);
  },
  batch: async statements => {
    await opened();

    return tauriSql.batch(statements);
  },
};

/** The desktop app's data: the SQLite file on the PC. Nothing here imports server code, which is what the desktop build checks. */
/** What only the desktop app has: its own files for download, and who is signed in. */
export interface DesktopExtras {
  exportFile: (format: 'json' | 'csv') => ReturnType<typeof exportFile>;
  currentUser: () => Promise<SignedInUser | null>;
}

const { signIn, signUp, signOut, currentUser } = createAuth(cloud);

export const local: DataSource & DesktopExtras = {
  ...createReads(sql),
  ...createChanges(sql),
  ...createFocusChanges(sql),
  ...createProfileChanges(sql),
  ...createAccountChanges(sql),
  signIn,
  signUp,
  signOut,
  currentUser,
  exportFile: format => {
    return exportFile(sql, format);
  },
  syncTimezone: deviceTimeZone => {
    return syncTimezone(sql, deviceTimeZone);
  },
  sendContact: notBuilt,
  register: notBuilt,
};
