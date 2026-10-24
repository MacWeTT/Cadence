import { createChanges } from '@/data/local/changes';
import { openUrl } from '@tauri-apps/plugin-opener';
import { backupFileName, toJson } from '@/lib/backup';
import { cloudAccount } from '@/data/local/account-port';
import { createAuth, type SignedInUser } from '@/data/local/auth';
import { createAccountChanges, exportFile } from '@/data/local/backup';
import { cloud } from '@/data/local/cloud';
import { createGoogle } from '@/data/local/google';
import { createFocusChanges } from '@/data/local/focus-changes';
import { migrate } from '@/data/local/migrations';
import { createStayInStep } from '@/data/local/stay-in-step';
import { cloudStep } from '@/data/local/step-port';
import { createSync } from '@/data/local/sync';
import { createProfileChanges } from '@/data/local/profile-changes';
import { createReads } from '@/data/local/reads';
import { execute, type Sql } from '@/data/local/sql';
import { tauriSql } from '@/data/local/tauri-sql';
import { syncTimezone } from '@/data/local/timezone';
import type { DataSource } from '@/data/types';

/** The contact form sends mail from a server; the desktop build leaves its page out, so nothing calls this. */
const needsServer = (): Promise<never> => {
  return Promise.reject(new Error('This needs the server, which the desktop app does not have.'));
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
  exportFile: (format: 'json' | 'csv' | 'pdf') => ReturnType<typeof exportFile>;
  currentUser: () => Promise<SignedInUser | null>;
  /** What the register screen shows, or `null` when nobody is signed in. */
  registration: () => Promise<{ email: string; tag: string; registered: boolean } | null>;
  /** Google sign-in through the system browser: open it, then finish from the `cadence://` link it comes back with. */
  /** The first-sign-in sync of this PC's file with the signed-in account. */
  sync: ReturnType<typeof createSync>;
  /** Sends what changed on the PC and brings in what changed on the account (a round; the account of the signed-in user). */
  stayInStep: (userId: string) => Promise<{ pushed: number; pulled: boolean }>;
  /** The account's data as a JSON file, to keep before the PC's copy replaces it. */
  accountCopy: () => Promise<{ fileName: string; type: string; text: string }>;
  startGoogle: () => Promise<{ error: string | null }>;
  finishGoogle: (link: string) => Promise<{ next: string | null; error: string | null } | null>;
}

const account = cloudAccount(cloud);

const stayInStep = createStayInStep(sql, cloudStep(cloud));

const { signIn, signUp, register, setPassword, registration, signOut, currentUser } = createAuth(cloud);

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
  setPassword: async input => {
    const result = await setPassword(input);

    // the PC's profile says the account has a password too, so the warning goes
    if (result.ok) {
      await execute(sql, 'update profile set password_set = 1 where id = 1');
    }

    return result;
  },
  signOut,
  currentUser,
  registration,
  sync: createSync(sql, account),
  stayInStep: stayInStep.run,
  accountCopy: async () => {
    const backup = await account.readBackup();

    return {
      fileName: backupFileName(backup.exportedAt.slice(0, 10), 'json'),
      type: 'application/json',
      text: toJson(backup),
    };
  },
  startGoogle,
  finishGoogle,
  exportFile: format => {
    return exportFile(sql, format);
  },
  syncTimezone: deviceTimeZone => {
    return syncTimezone(sql, deviceTimeZone);
  },
  sendContact: needsServer,
};
