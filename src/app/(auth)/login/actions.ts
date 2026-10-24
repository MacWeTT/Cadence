'use server';

import { signInInputSchema, signUpInputSchema } from '@/lib/auth-schema';
import { safeNext } from '@/lib/next-path';
import { failure, invalidInput, type AuthResult } from '@/server/auth-result';
import { signInWithPassword, signUpWithEmail } from '@/server/sign-in';

/** Signs in with a tag or an email and a password, and answers where to go on to: `next`, or Home. */
export const signInAction = async (input: unknown, next: string | null): Promise<AuthResult> => {
  const { success, data, error } = signInInputSchema.safeParse(input);

  if (!success) {
    return invalidInput(error.issues[0].message);
  }

  const { mode, identifier, password } = data;

  try {
    await signInWithPassword(mode, identifier, password);
  } catch (e) {
    return failure(e);
  }

  return { next: safeNext(next), error: null };
};

/** Makes an account with an email, a tag and a password, signs it in, and answers where to go on to. */
export const signUpAction = async (input: unknown, next: string | null): Promise<AuthResult> => {
  const { success, data, error } = signUpInputSchema.safeParse(input);

  if (!success) {
    return invalidInput(error.issues[0].message);
  }

  const { email, tag, password } = data;

  try {
    await signUpWithEmail(email, tag, password);
  } catch (e) {
    return failure(e);
  }

  return { next: safeNext(next), error: null };
};
