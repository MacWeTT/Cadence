import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from './config';

export const createSupabaseBrowserClient = () => {
  const { url, key } = supabaseConfig();

  return createBrowserClient(url, key);
};
