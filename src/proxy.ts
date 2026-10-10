import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

export const proxy = (request: NextRequest) => {
  return updateSession(request);
};

export const config = {
  // Everything except static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
