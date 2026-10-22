'use server';

import { registerInputSchema } from '@/lib/auth-schema';
import { safeNext } from '@/lib/next-path';
import { getUser } from '@/lib/supabase/server';
import { failure, invalidInput, type AuthResult } from '@/server/auth-result';
import { ProfileError } from '@/server/profile-storage';
import { completeRegistration } from '@/server/registration';

/** Saves the tag and the password, marks the account registered, and answers where to go on to: `next`, or Home. */
export const registerAction = async (input: unknown, next: string | null): Promise<AuthResult> => {
  if (!(await getUser())) {
    return failure(new ProfileError('signIn'));
  }

  const { success, data, error } = registerInputSchema.safeParse(input);

  if (!success) {
    return invalidInput(error.issues[0].message);
  }

  const { tag, password } = data;

  try {
    await completeRegistration(tag, password);
  } catch (e) {
    return failure(e);
  }

  return { next: safeNext(next), error: null };
};
