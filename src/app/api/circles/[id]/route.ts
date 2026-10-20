import { circleIdInput } from '@/lib/circle-schema';
import { isSignedIn } from '@/server/account';
import { getCircle } from '@/server/circles';
import { HabitError } from '@/server/habits';

/** One circle as the person may see it. A circle that does not exist and one they are not in look the same: not found. */
export const GET = async (_request: Request, context: RouteContext<'/api/circles/[id]'>) => {
  const { id } = await context.params;

  if (!(await isSignedIn())) {
    return Response.json({ error: 'signIn' }, { status: 401 });
  }

  if (!circleIdInput.safeParse(id).success) {
    return Response.json({ error: 'notFound' }, { status: 404 });
  }

  try {
    return Response.json(await getCircle(id));
  } catch (error) {
    if (error instanceof HabitError && error.code === 'notAMember') {
      return Response.json({ error: 'notFound' }, { status: 404 });
    }

    throw error;
  }
};
