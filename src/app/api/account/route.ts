import { isSignedIn } from '@/server/account';
import { getAccountCounts } from '@/server/backup';

/** How much the account holds, for the Account tab's cache. */
export const GET = async () => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  return Response.json(await getAccountCounts());
};
