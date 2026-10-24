import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { AuthResult } from '@/data/types';
import { ProfileError } from '@/server/profile-storage';

/** What the register, sign-in and create-account forms hear back: where to go on to, or the message to show. */
export type { AuthResult };

/** A refusal in words: a code the server threw (shown as its message), or the generic one for anything else. */
export const failure = async (error: unknown): Promise<AuthResult> => {
  const [t, tv] = await Promise.all([getTranslations('errors'), getTranslations('validation')]);

  if (error instanceof ProfileError) {
    const { code } = error;

    return { next: null, error: code === 'signIn' ? t('signIn') : tv(code as 'tagTaken') };
  }

  console.error(error);

  return { next: null, error: t('generic') };
};

/** The first thing wrong with what was typed, as a message. `code` is the issue's message in the schema. */
export const invalidInput = async (code: string): Promise<AuthResult> => {
  const tv = await getTranslations('validation');

  return { next: null, error: tv(code as 'tagInvalid') };
};
