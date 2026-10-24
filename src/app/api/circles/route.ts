import { isSignedIn } from '@/server/account';
import { listCircles } from '@/server/circles';

/** The circles the person is in, for the browser's cache. */
export const GET = async () => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  return Response.json(await listCircles());
};
