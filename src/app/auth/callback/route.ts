import { NextResponse, type NextRequest } from 'next/server';
import { NEXT_COOKIE, safeNext } from '@/lib/next-path';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const decode = (value: string | undefined): string | null => {
  try {
    return value ? decodeURIComponent(value) : null;
  } catch {
    return null;
  }
};

// Google sends the user back here with a one-time code, which we exchange for a session cookie. A new account goes on to
// the register screen (choose a tag and a password); everyone else goes where they were headed, or Home.
export const GET = async (request: NextRequest) => {
  const { nextUrl, cookies } = request;
  const { searchParams, origin } = nextUrl;
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const next = safeNext(decode(cookies.get(NEXT_COOKIE)?.value));
      const { data } = await supabase.from('profiles').select('registered_at').maybeSingle();
      const target = data && data.registered_at === null ? `/register?next=${encodeURIComponent(next)}` : next;
      const response = NextResponse.redirect(`${origin}${target}`);

      response.cookies.delete(NEXT_COOKIE);

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
};
