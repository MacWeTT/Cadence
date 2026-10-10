import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseConfig } from './config';

const PUBLIC_PATHS = ['/login', '/auth'];

/**
 * Refreshes the Supabase session cookie and sends signed-out visitors to /login (and signed-in ones away from
 * it). This is an optimistic check on the token only; pages that load user data must still verify the user.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { url, key } = supabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!signedIn && !isPublic) return redirectTo(request, '/login');
  if (signedIn && pathname === '/login') return redirectTo(request, '/');
  return response;
}

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = '';
  return NextResponse.redirect(target);
}
