import 'server-only';
import { connection } from 'next/server';
import { parseBackup } from '@/lib/backup';
import type { Backup, BackupError, BackupSummary } from '@/lib/backup-types';
import type { Json } from '@/lib/supabase/database.types';
import { countAccount, readAccountBackup } from '@/server/backup-read';
import { getProfile } from '@/server/habits';
import { requireOwner } from '@/server/profile';
import { ProfileError } from '@/server/profile-storage';

/** A file that cannot be used: the reason is a code the action turns into words. */
export class BackupRefused extends Error {
  constructor(readonly error: BackupError) {
    super(error.code);
  }
}

/** Everything the account holds that a backup carries, as one backup. Reads through the person's own session. */
export const getBackup = async (): Promise<Backup> => {
  await connection(); // the Supabase client reads the clock (token expiry); this must only run at request time
  const { supabase, id } = await requireOwner();

  return readAccountBackup(supabase, id);
};

/** How much the account holds, for the export card (and its warning when an import would refuse it). */
export const getAccountCounts = async (): Promise<BackupSummary> => {
  await connection();
  const { supabase } = await requireOwner();

  return countAccount(supabase);
};

/** What the database says when it refuses a row, as the reason shown to the person. */
const DATABASE_REASONS: Record<string, string> = {
  before_start: 'tickBeforeStart',
  date_in_future: 'tickInFuture',
};

/**
 * Replaces the person's habits and history with a backup file, all or nothing. The file is checked here again (it was
 * checked in the browser too); the database function has the last word.
 */
export const importBackup = async (text: string, fileName: string): Promise<BackupSummary> => {
  const { today } = await getProfile();
  const parsed = parseBackup(text, fileName, today);

  if (!parsed.ok) {
    const { error: refusal } = parsed;

    throw new BackupRefused(refusal);
  }

  const { backup } = parsed;
  const { supabase } = await requireOwner();
  const { data, error } = await supabase.rpc('replace_my_data', { p_backup: backup as unknown as Json });

  if (error) {
    const reason = DATABASE_REASONS[error.message];

    if (reason) {
      throw new BackupRefused({ code: 'invalid', values: { where: 'file', field: '', reason } });
    }

    throw error;
  }

  return data as unknown as BackupSummary;
};

const PAGE = 100;

/** Removes every file the person has uploaded to a bucket (their folder is named by their id). */
const removeFolder = async (bucket: 'avatars' | 'sounds'): Promise<void> => {
  const { supabase, id } = await requireOwner();
  const { storage } = supabase;

  for (;;) {
    const { data, error } = await storage.from(bucket).list(id, { limit: PAGE });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return;
    }

    const { error: removeError } = await storage.from(bucket).remove(
      data.map(({ name }) => {
        return `${id}/${name}`;
      }),
    );

    if (removeError) {
      throw removeError;
    }
  }
};

/**
 * Deletes the account and everything in it. The typed email must match. The files go first and the account last, so a
 * failure part way leaves an account that still works.
 */
export const deleteAccount = async (typedEmail: string): Promise<void> => {
  const { supabase, email } = await requireOwner();

  if (email === '' || typedEmail.trim().toLowerCase() !== email.toLowerCase()) {
    throw new ProfileError('emailMismatch');
  }

  await removeFolder('avatars');
  await removeFolder('sounds');

  const { error } = await supabase.rpc('delete_my_account');

  if (error) {
    throw error;
  }

  await supabase.auth.signOut({ scope: 'local' });
};
