'use server';

import { getTranslations } from 'next-intl/server';
import { backupErrorText } from '@/lib/backup-error-text';
import { BACKUP_LIMITS, type BackupError, type BackupSummary } from '@/lib/backup-types';
import { getUser } from '@/lib/supabase/server';
import { BackupRefused, deleteAccount, importBackup } from '@/server/backup';
import { ProfileError } from '@/server/profile-storage';

/** What an account action answers: the browser shows the message as an error toast. */
export type AccountActionResult = { ok: true; summary?: BackupSummary } | { ok: false; error: string };

const words = async (error: BackupError): Promise<string> => {
  return backupErrorText(await getTranslations('account.import'), error);
};

const fail = async (error: unknown): Promise<AccountActionResult> => {
  const te = await getTranslations('errors');

  if (error instanceof BackupRefused) {
    const { error: refusal } = error;

    return { ok: false, error: await words(refusal) };
  }

  if (error instanceof ProfileError) {
    return { ok: false, error: te(error.code as 'emailMismatch') };
  }

  console.error(error);

  return { ok: false, error: te('generic') };
};

/** Replaces the person's habits and history with a backup file (the browser checked it first; this checks it again). */
export const importBackupAction = async (form: FormData): Promise<AccountActionResult> => {
  const te = await getTranslations('errors');

  if (!(await getUser())) {
    return { ok: false, error: te('signIn') };
  }

  const file = form.get('file');

  if (!(file instanceof File)) {
    return fail(new BackupRefused({ code: 'notBackup' }));
  }

  const { name, size } = file;

  if (size > BACKUP_LIMITS.bytes) {
    return fail(new BackupRefused({ code: 'tooBig', values: { limit: '5 MB' } }));
  }

  try {
    return { ok: true, summary: await importBackup(await file.text(), name) };
  } catch (e) {
    return fail(e);
  }
};

/** Deletes the account after the typed email matches. The browser then goes to the login page. */
export const deleteAccountAction = async (email: unknown): Promise<AccountActionResult> => {
  const te = await getTranslations('errors');

  if (!(await getUser())) {
    return { ok: false, error: te('signIn') };
  }

  if (typeof email !== 'string') {
    return fail(new ProfileError('emailMismatch'));
  }

  try {
    await deleteAccount(email);

    return { ok: true };
  } catch (e) {
    return fail(e);
  }
};
