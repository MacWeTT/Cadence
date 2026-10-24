import { isSignedIn } from '@/server/account';
import { listShowedUpToday } from '@/server/circles';

/** The friends who showed up today, across the person's circles (the line on Home). */
export const GET = async () => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  return Response.json(await listShowedUpToday());
};
