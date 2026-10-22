import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProfileError } from '@/server/profile-storage';

/**
 * Signs in with a tag or an email and a password; the session cookie is set on success. By tag, the database finds the
 * email (and only when the password is right, see `login_email`). Every refusal says the same thing, so it does not
 * tell a wrong tag from a wrong password; only a lockout says so, and it counts unknown tags too.
 */
export const signInWithPassword = async (
  mode: 'tag' | 'email',
  identifier: string,
  password: string,
): Promise<void> => {
  const supabase = await createSupabaseServerClient();
  let email = identifier;

  if (mode === 'tag') {
    const { data, error } = await supabase.rpc('login_email', { p_tag: identifier, p_password: password });

    if (error) {
      throw error;
    }

    const [found] = data;

    if (found?.locked) {
      throw new ProfileError('signInLocked');
    }

    if (!found?.email) {
      throw new ProfileError('signInFailed');
    }

    email = found.email;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new ProfileError(error.code === 'over_request_rate_limit' ? 'signInLocked' : 'signInFailed');
  }
};

/**
 * Makes an account with an email, a tag and a password, and signs it in (there is no confirmation mail). The tag is
 * checked first so a taken one does not leave a half-made account; the account is then marked registered, because it
 * chose everything the register screen asks for. A tag that is taken in the meantime leaves the account unregistered,
 * and the register screen at its next sign-in lets the person choose another.
 */
export const signUpWithEmail = async (email: string, tag: string, password: string): Promise<void> => {
  const supabase = await createSupabaseServerClient();
  const { data: free, error: freeError } = await supabase.rpc('tag_available', { p_tag: tag });

  if (freeError) {
    throw freeError;
  }

  if (!free) {
    throw new ProfileError('tagTaken');
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    throw error.code === 'user_already_exists' ? new ProfileError('emailTaken') : error;
  }

  const { user, session } = data;

  if (!user || !session) {
    throw new Error('Sign-up did not sign the account in: is "Confirm email" on?');
  }

  const { error: saveError } = await supabase
    .from('profiles')
    .update({ tag, registered_at: new Date().toISOString(), password_set: true })
    .eq('user_id', user.id);

  if (saveError) {
    throw saveError.code === '23505' ? new ProfileError('tagTaken') : saveError;
  }
};
