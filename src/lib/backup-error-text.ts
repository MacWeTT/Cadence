import type { BackupError } from '@/lib/backup-types';

/** `useTranslations('account.import')` or `getTranslations('account.import')`, loosened so one function can use either. */
type Translate = (key: never, values?: never) => string;

/** A refused backup file as a sentence. A reason from the file's checks is a code of its own: shown as words. */
export const backupErrorText = (t: Translate, error: BackupError): string => {
  const say = t as unknown as (key: string, values?: Record<string, string | number>) => string;
  const { code, values = {} } = error;
  const { reason, ...rest } = values;
  const shown = typeof reason === 'string' ? { ...rest, reason: say(`reasons.${reason}`) } : values;

  return say(`errors.${code}`, shown);
};
