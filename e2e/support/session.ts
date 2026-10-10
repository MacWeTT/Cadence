import { createServerClient } from '@supabase/ssr';

export type StorageState = {
  cookies: {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax';
  }[];
  origins: [];
};

/**
 * Signs in with email and password and returns the Playwright storage state holding the same session cookies
 * the app's @supabase/ssr client would set. Each call creates a fresh session, so a test can sign out
 * without invalidating the shared one.
 */
export const signInState = async (email: string, password: string): Promise<StorageState> => {
  const jar = new Map<string, string>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => {
          return [...jar].map(([name, value]) => {
            return { name, value };
          });
        },
        setAll: list => {
          return list.forEach(({ name, value }) => {
            return jar.set(name, value);
          });
        },
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  await supabase.auth.getSession(); // make sure the session cookies have been written to the jar

  return {
    cookies: [...jar].map(([name, value]) => {
      return {
        name,
        value,
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      };
    }),
    origins: [],
  };
};
