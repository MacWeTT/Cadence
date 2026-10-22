import 'server-only';
import { connection } from 'next/server';
import { requireOwner, updateTag } from '@/server/profile';
import { ProfileError } from '@/server/profile-storage';

export interface RegistrationView {
  /** The account's email, locked on the form (empty when the provider hid it). */
  email: string;
  tag: string;
  registered: boolean;
}

export const getRegistration = async (): Promise<RegistrationView> => {
  await connection(); // the Supabase client reads the clock (token expiry); this must only run at request time
  const { supabase, id, email } = await requireOwner();
  const { data, error } = await supabase.from('profiles').select('tag, registered_at').eq('user_id', id).single();

  if (error) {
    throw error;
  }

  const { tag, registered_at } = data;

  return { email, tag, registered: registered_at !== null };
};

/** Sets the password of the signed-in account. A password Supabase turns down is the person's to change, not a failure. */
const savePassword = async (password: string): Promise<void> => {
  const { supabase, id } = await requireOwner();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new ProfileError(error.code === 'same_password' ? 'passwordSame' : 'passwordRejected');
  }

  const { error: markError } = await supabase.from('profiles').update({ password_set: true }).eq('user_id', id);

  if (markError) {
    throw markError;
  }
};

export const setPassword = async (password: string): Promise<void> => {
  await savePassword(password);
};

/**
 * Finishes the register screen: the tag first (a taken one is refused before anything else changes), then the password,
 * then the account is marked registered. Sending the same form again after a refusal is safe.
 */
export const completeRegistration = async (tag: string, password: string): Promise<void> => {
  await updateTag(tag);
  await savePassword(password);

  const { supabase, id } = await requireOwner();
  const { error } = await supabase
    .from('profiles')
    .update({ registered_at: new Date().toISOString() })
    .eq('user_id', id);

  if (error) {
    throw error;
  }
};
