'use server';

import { getTranslations } from 'next-intl/server';
import { registerInputSchema } from '@/lib/auth-schema';
import { safeNext } from '@/lib/next-path';
import { getUser } from '@/lib/supabase/server';
import { ProfileError } from '@/server/profile-storage';
import { completeRegistration } from '@/server/registration';

/** What the register form hears back: where to go on to, or the message to show. */
export type RegisterResult = { next: string | null; error: string | null };

const fail = async (error: unknown): Promise<RegisterResult> => {
  const [t, tv] = await Promise.all([getTranslations('errors'), getTranslations('validation')]);

  if (error instanceof ProfileError) {
    const { code } = error;

    return { next: null, error: code === 'signIn' ? t('signIn') : tv(code as 'tagTaken') };
  }

  console.error(error);

  return { next: null, error: t('generic') };
};

/** Saves the tag and the password, marks the account registered, and answers where to go on to: `next`, or Home. */
export const registerAction = async (input: unknown, next: string | null): Promise<RegisterResult> => {
  if (!(await getUser())) {
    return fail(new ProfileError('signIn'));
  }

  const { success, data, error } = registerInputSchema.safeParse(input);

  if (!success) {
    const [issue] = error.issues;
    const tv = await getTranslations('validation');

    return { next: null, error: tv(issue.message as 'tagInvalid') };
  }

  const { tag, password } = data;

  try {
    await completeRegistration(tag, password);
  } catch (e) {
    return fail(e);
  }

  return { next: safeNext(next), error: null };
};
