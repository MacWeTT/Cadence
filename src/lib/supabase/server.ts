import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { supabaseConfig } from './config';
import type { Database } from './database.types';

export const createSupabaseServerClient = async () => {
  const { url, key } = supabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => {return cookieStore.getAll()},
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => {return cookieStore.set(name, value, options)});
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes the session instead.
        }
      },
    },
  });
};

/** The signed-in user, verified with the Supabase Auth server, or null. Reads cookies, so call it behind <Suspense>. */
export const getUser = async (): Promise<User | null> => {
  await connection(); // the Supabase session check calls Date.now(), which must only run at request time
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return data.user;
};
