import { isSignedIn } from '@/server/account';
import { getProgressData } from '@/server/progress';

/** The Progress page's data, for the browser's cache: `?habit=<id>&range=<days>`, both optional. */
export const GET = async (request: Request) => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  return Response.json(
    await getProgressData(searchParams.get('habit') ?? undefined, searchParams.get('range') ?? undefined),
  );
};
