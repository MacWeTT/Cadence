import { createClient } from '@supabase/supabase-js';
import type { Cloud } from '@/data/local/auth';
import { supabaseConfig } from '@/lib/supabase/config';

let client: Cloud | null = null;

const get = (): Cloud => {
  const { url, key } = supabaseConfig();

  // The session is kept on the PC and refreshed on its own; there is no page address to read a sign-in from here.
  client ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  return client;
};

/** The app's Supabase client, made the first time it is used so an app without the settings still works offline. */
export const cloud = new Proxy({} as Cloud, {
  get: (_target, property) => {
    return Reflect.get(get(), property);
  },
});
