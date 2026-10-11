import 'server-only';
import { getUser } from '@/lib/supabase/server';

/** The signed-in user's name and email, as given when they signed in with Google. */
export const getAccountContact = async (): Promise<{ name: string; email: string }> => {
  const user = await getUser();
  const { full_name } = user?.user_metadata ?? {};

  return { name: full_name ?? '', email: user?.email ?? '' };
};

/** Whether a verified user is signed in (for the endpoints the browser's cache reads from). */
export const isSignedIn = async (): Promise<boolean> => {
  return Boolean(await getUser());
};
