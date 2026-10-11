import { isSignedIn } from '@/server/account';
import { listHabits } from '@/server/habits';

/** The Habits page's data, for the browser's cache. */
export const GET = async () => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  return Response.json(await listHabits());
};
