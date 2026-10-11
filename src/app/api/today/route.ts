import { isSignedIn } from '@/server/account';
import { getTodayView } from '@/server/today';

/** One day of the Today page, for the browser's cache: `?date=YYYY-MM-DD`, or today without it. */
export const GET = async (request: Request) => {
  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  const date = new URL(request.url).searchParams.get('date') ?? undefined;

  return Response.json(await getTodayView(date));
};
