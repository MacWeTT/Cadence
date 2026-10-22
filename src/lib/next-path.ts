/** The cookie that carries where the person was going across the round trip through Google. */
export const NEXT_COOKIE = 'cadence_next';

/** Pages that must never be where a sign-in ends: that would loop. */
const AUTH_PAGES = ['/login', '/register', '/auth'];

/**
 * Where to go once signed in and registered. Only a path on the app itself is accepted (one leading slash, no scheme,
 * no backslash); anything else, and the auth pages, mean Home.
 */
export const safeNext = (value: string | null | undefined): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/';
  }

  const path = value.split(/[?#]/)[0];
  const looping = AUTH_PAGES.some(page => {
    return path === page || path.startsWith(`${page}/`);
  });

  return looping ? '/' : value;
};
