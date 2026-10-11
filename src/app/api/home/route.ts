import { isSignedIn } from '@/server/account';
import { getHomeData } from '@/server/home';

/** The Home page's data, for the browser's cache. */
export const GET = async () => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  return Response.json(await getHomeData());
};
