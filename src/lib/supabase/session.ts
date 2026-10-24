import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/next-path';
import { supabaseConfig } from '@/lib/supabase/config';

const PUBLIC_PATHS = ['/login', '/auth'];

/**
 * Refreshes the Supabase session cookie and sends signed-out visitors to /login (and signed-in ones away from
 * it). This is an optimistic check on the token only; pages that load user data must still verify the user.
 */
export const updateSession = async (request: NextRequest): Promise<NextResponse> => {
  const { url, key } = supabaseConfig();
  const { cookies, nextUrl } = request;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => {return cookies.getAll()},
      setAll(toSet, headers) {
        toSet.forEach(({ name, value }) => {return cookies.set(name, value)});
        response = NextResponse.next({ request });
        const { cookies: responseCookies, headers: responseHeaders } = response;

        toSet.forEach(({ name, value, options }) => {return responseCookies.set(name, value, options)});
        Object.entries(headers).forEach(([k, v]) => {return responseHeaders.set(k, v)});
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search, searchParams } = nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => {return pathname === p || pathname.startsWith(`${p}/`)});

  // The browser's cache reads from /api: it gets a plain 401 to act on, not a redirect to the login page's HTML.
  if (!signedIn && pathname.startsWith('/api/')) {return NextResponse.json({ error: 'signIn' }, { status: 401 });}

  // A signed-out visitor to a page other than Home is sent back to it after signing in (an invite link, for one).
  if (!signedIn && !isPublic) {return redirectTo(request, '/login', pathname === '/' ? '/' : pathname + search);}

  if (signedIn && pathname === '/login') {return redirectTo(request, safeNext(searchParams.get('next')));}

  return response;
};

/** `to` is a path, with its query when it has one. `next` is where to come back to after signing in. */
const redirectTo = (request: NextRequest, to: string, next?: string): NextResponse => {
  const target = request.nextUrl.clone();
  const [pathname, search = ''] = to.split('?');

  target.pathname = pathname;
  target.search = next && next !== '/' ? `?next=${encodeURIComponent(next)}` : search ? `?${search}` : '';

  return NextResponse.redirect(target);
};
