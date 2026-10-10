'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const signOut = async () => {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login');
};
