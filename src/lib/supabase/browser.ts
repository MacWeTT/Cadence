import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from '@/lib/supabase/config';

export const createSupabaseBrowserClient = () => {
  const { url, key } = supabaseConfig();

  return createBrowserClient(url, key);
};
