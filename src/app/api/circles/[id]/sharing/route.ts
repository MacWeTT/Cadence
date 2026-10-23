import { circleIdInput } from '@/lib/circle-schema';
import { isSignedIn } from '@/server/account';
import { getSharing } from '@/server/circles';
import { HabitError } from '@/server/habits';

/** What the person shares with one circle. Only the owner of the habits sees this, and only while in the circle. */
export const GET = async (_request: Request, context: RouteContext<'/api/circles/[id]/sharing'>) => {
  const { id } = await context.params;

  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  if (!circleIdInput.safeParse(id).success) {
    return Response.json({ error: 'notFound' }, { status: 404 });
  }

  try {
    return Response.json(await getSharing(id));
  } catch (error) {
    if (error instanceof HabitError && error.code === 'notAMember') {
      return Response.json({ error: 'notFound' }, { status: 404 });
    }

    throw error;
  }
};
