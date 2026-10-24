import type { AccountSettings } from '@/data/local/sync';

/** The profile columns the PC and the account share: read from the account, and written onto the PC after a pull. */
export const SETTINGS_KEYS = [
  'display_name',
  'tag',
  'timezone',
  'week_starts_on',
  'sound_id',
  'sound_volume',
  'accent',
  'accent_custom',
  'password_set',
  'avatar_kind',
  'avatar_value',
  'avatar_color',
  'avatar_url',
] as const satisfies readonly (keyof AccountSettings)[];

/**
 * What a change made on the PC may send to the account. Whether the account has a password and the address of the Google
 * picture are the account's alone: the PC only shows them, so they are never sent.
 */
export const PUSHED_KEYS = SETTINGS_KEYS.filter(key => {
  return key !== 'password_set' && key !== 'avatar_url';
});

export const SETTINGS_COLUMNS = SETTINGS_KEYS.join(', ');

/** A value as the local file keeps it: it holds numbers and text, never booleans. */
export const toLocalValue = (value: unknown): unknown => {
  return typeof value === 'boolean' ? Number(value) : value;
};

/** The profile row as settings: the file's 0 and 1 of the password flag are a boolean, as the account says it. */
export const fromLocalRow = (row: Record<string, unknown>): AccountSettings => {
  return { ...row, password_set: row.password_set === 1 } as unknown as AccountSettings;
};
