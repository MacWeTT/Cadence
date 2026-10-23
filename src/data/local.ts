import { createChanges } from '@/data/local/changes';
import { openUrl } from '@tauri-apps/plugin-opener';
import { createAuth, type SignedInUser } from '@/data/local/auth';
import { createAccountChanges, exportFile } from '@/data/local/backup';
import { cloud } from '@/data/local/cloud';
import { createGoogle } from '@/data/local/google';
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
  /** What the register screen shows, or `null` when nobody is signed in. */
  registration: () => Promise<{ email: string; tag: string; registered: boolean } | null>;
  /** Google sign-in through the system browser: open it, then finish from the `cadence://` link it comes back with. */
  startGoogle: () => Promise<{ error: string | null }>;
  finishGoogle: (link: string) => Promise<{ next: string | null; error: string | null } | null>;
}

const { signIn, signUp, register, registration, signOut, currentUser } = createAuth(cloud);

// The site that hosts `/auth/desktop`, the page Google comes back to (it must be an allowed redirect in Supabase).
const { start: startGoogle, finish: finishGoogle } = createGoogle(
  cloud,
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  openUrl,
);

export const local: DataSource & DesktopExtras = {
  ...createReads(sql),
  ...createChanges(sql),
  ...createFocusChanges(sql),
  ...createProfileChanges(sql),
  ...createAccountChanges(sql),
  signIn,
  signUp,
  register,
  signOut,
  currentUser,
  registration,
  startGoogle,
  finishGoogle,
  exportFile: format => {
    return exportFile(sql, format);
  },
  syncTimezone: deviceTimeZone => {
    return syncTimezone(sql, deviceTimeZone);
  },
  sendContact: notBuilt,
};
