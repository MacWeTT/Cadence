import { isSignedIn } from '@/server/account';
import { getProfileView } from '@/server/profile';

/** The signed-in person's profile, for the browser's cache. */
export const GET = async () => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  return Response.json(await getProfileView());
};
