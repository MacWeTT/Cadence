import { isSignedIn } from '@/server/account';
import { getFocusState } from '@/server/focus';

/** The running focus session and the last-used numbers per habit, for the browser's cache. */
export const GET = async () => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  return Response.json(await getFocusState());
};
