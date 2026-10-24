import type { SupabaseClient } from '@supabase/supabase-js';
import { passwordChangeSchema, registerInputSchema, signInInputSchema, signUpInputSchema } from '@/lib/auth-schema';
import { msg, translateMsg, type MessageKey } from '@/lib/message';
import { safeNext } from '@/lib/next-path';
import type { Database } from '@/lib/supabase/database.types';
import { t } from '@/data/local/outcome';
import type { AuthResult, ProfileActionResult } from '@/data/types';

/** Supabase, signed in as the person (or not yet). Row-level security is what protects the data, as on the web. */
export type Cloud = SupabaseClient<Database>;

export interface SignedInUser {
  id: string;
  email: string;
}

/** Why a sign-in or sign-up was refused; each code is a message in `locales/en/validation.json`. */
class Refused extends Error {}

const words = (code: string): AuthResult => {
  return { next: null, error: translateMsg(t, msg(`validation.${code}` as MessageKey)) };
};

const refuse = (error: unknown): AuthResult => {
  if (error instanceof Refused) {
    return words(error.message);
  }

  console.error(error);

  return { next: null, error: translateMsg(t, msg('errors.generic')) };
};

/**
 * Signing in and out from the app, the way the web app does it (`src/server/sign-in.ts`) but straight from the device.
 * Every refusal of a password says the same thing, so a wrong tag is not told from a wrong password.
 */
export const createAuth = (cloud: Cloud) => {
  const signIn = async (input: unknown, next: string | null): Promise<AuthResult> => {
    const { success, data, error } = signInInputSchema.safeParse(input);

    if (!success) {
      return words(error.issues[0].message);
    }

    const { mode, identifier, password } = data;
    const { auth } = cloud;

    try {
      let email = identifier;

      if (mode === 'tag') {
        const { data: rows, error: rpcError } = await cloud.rpc('login_email', {
          p_tag: identifier,
          p_password: password,
        });

        if (rpcError) {
          throw rpcError;
        }

        const [found] = rows;

        if (found?.locked) {
          throw new Refused('signInLocked');
        }

        if (!found?.email) {
          throw new Refused('signInFailed');
        }

        email = found.email;
      }

      const { error: signInError } = await auth.signInWithPassword({ email, password });

      if (signInError) {
        throw new Refused(signInError.code === 'over_request_rate_limit' ? 'signInLocked' : 'signInFailed');
      }
    } catch (e) {
      return refuse(e);
    }

    return { next: safeNext(next), error: null };
  };

  const signUp = async (input: unknown, next: string | null): Promise<AuthResult> => {
    const { success, data, error } = signUpInputSchema.safeParse(input);

    if (!success) {
      return words(error.issues[0].message);
    }

    const { email, tag, password } = data;
    const { auth } = cloud;

    try {
      const { data: free, error: freeError } = await cloud.rpc('tag_available', { p_tag: tag });

      if (freeError) {
        throw freeError;
      }

      if (!free) {
        throw new Refused('tagTaken');
      }

      const { data: made, error: signUpError } = await auth.signUp({ email, password });

      if (signUpError) {
        throw signUpError.code === 'user_already_exists' ? new Refused('emailTaken') : signUpError;
      }

      const { user, session } = made;

      if (!user || !session) {
        throw new Error('Sign-up did not sign the account in: is "Confirm email" on?');
      }

      const { error: saveError } = await cloud
        .from('profiles')
        .update({ tag, registered_at: new Date().toISOString(), password_set: true })
        .eq('user_id', user.id);

      if (saveError) {
        throw saveError.code === '23505' ? new Refused('tagTaken') : saveError;
      }
    } catch (e) {
      return refuse(e);
    }

    return { next: safeNext(next), error: null };
  };

  /** Finishes the register screen: the tag first (a taken one is refused before anything changes), then the password. */
  const register = async (input: unknown, next: string | null): Promise<AuthResult> => {
    const { success, data, error } = registerInputSchema.safeParse(input);

    if (!success) {
      return words(error.issues[0].message);
    }

    const { tag, password } = data;
    const { auth } = cloud;

    try {
      const { data: free, error: freeError } = await cloud.rpc('tag_available', { p_tag: tag });

      if (freeError) {
        throw freeError;
      }

      if (!free) {
        throw new Refused('tagTaken');
      }

      const { error: passwordError } = await auth.updateUser({ password });

      if (passwordError) {
        throw new Refused(passwordError.code === 'same_password' ? 'passwordSame' : 'passwordRejected');
      }

      const { data: user } = await auth.getUser();
      const { error: saveError } = await cloud
        .from('profiles')
        .update({ tag, registered_at: new Date().toISOString(), password_set: true })
        .eq('user_id', user.user?.id ?? '');

      if (saveError) {
        throw saveError.code === '23505' ? new Refused('tagTaken') : saveError;
      }
    } catch (e) {
      return refuse(e);
    }

    return { next: safeNext(next), error: null };
  };

  /** True for an account that has not been through the register screen yet (a first Google sign-in). */
  const needsRegistration = async (): Promise<boolean> => {
    const { data } = await cloud.from('profiles').select('registered_at').maybeSingle();

    return data !== null && data.registered_at === null;
  };

  /** What the register screen shows: the account's email and its default tag, and whether it has registered already. */
  const registration = async (): Promise<{ email: string; tag: string; registered: boolean } | null> => {
    const [user, { data }] = await Promise.all([
      currentUser(),
      cloud.from('profiles').select('tag, registered_at').maybeSingle(),
    ]);

    if (!user || !data) {
      return null;
    }

    const { tag, registered_at } = data;

    return { email: user.email, tag, registered: registered_at !== null };
  };

  /** Sets (or changes) the account's password and marks the account as having one. It needs someone signed in. */
  const setPassword = async (input: unknown): Promise<ProfileActionResult> => {
    const { success, data, error } = passwordChangeSchema.safeParse(input);

    if (!success) {
      return { ok: false, error: words(error.issues[0].message).error ?? '' };
    }

    const user = await currentUser();

    if (!user) {
      return { ok: false, error: translateMsg(t, msg('errors.needsAccount')) };
    }

    const { auth } = cloud;

    try {
      const { error: passwordError } = await auth.updateUser({ password: data.password });

      if (passwordError) {
        throw new Refused(passwordError.code === 'same_password' ? 'passwordSame' : 'passwordRejected');
      }

      const { error: saveError } = await cloud.from('profiles').update({ password_set: true }).eq('user_id', user.id);

      if (saveError) {
        throw saveError;
      }
    } catch (e) {
      return { ok: false, error: refuse(e).error ?? '' };
    }

    return { ok: true };
  };

  const sessionOf = () => {
    const { auth } = cloud;

    return auth;
  };

  /** Who is signed in, from the session kept on the PC: it needs no connection, so it works offline. */
  const currentUser = async (): Promise<SignedInUser | null> => {
    try {
      const { data } = await sessionOf().getSession();
      const user = data.session?.user;

      if (!user) {
        return null;
      }

      const { id, email } = user;

      return { id, email: email ?? '' };
    } catch {
      return null;
    }
  };

  const signOut = async (): Promise<void> => {
    await sessionOf().signOut();
  };

  return { signIn, signUp, register, setPassword, needsRegistration, registration, currentUser, signOut };
};
