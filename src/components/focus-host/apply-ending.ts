import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { dataSource } from '@/data';
import { queryKeys } from '@/lib/query/keys';
import type { FocusResult } from '@/server/focus';

/**
 * What the two boxes of the ending window do once it is closed: "I did it" ticks the habit for the day the session started
 * (unless it already is), and an unticked "Count this time in focus" drops the session so its minutes are not counted.
 * It waits for the Stop it depends on (`after`) first, and a refusal is a toast. Afterwards the lists are read again.
 */
export const applyEnding = async (
  queryClient: QueryClient,
  result: Pick<FocusResult, 'habitId' | 'date' | 'sessionId'> & { ticked: boolean },
  boxes: { didIt: boolean; countIt: boolean },
  after: Promise<unknown>,
): Promise<void> => {
  const { habitId, date, sessionId, ticked } = result;
  const { didIt, countIt } = boxes;

  await after;

  if (didIt && !ticked) {
    const response = await dataSource.setCompletion(habitId, date, true);

    if (!response.ok) {
      toast.error(response.error);
    }
  }

  if (!countIt) {
    const response = await dataSource.discardFocus(sessionId);

    if (!response.ok) {
      toast.error(response.error);
    }
  }

  for (const queryKey of [queryKeys.todayAll, queryKeys.home, queryKeys.progressAll, queryKeys.focus]) {
    void queryClient.invalidateQueries({ queryKey });
  }
};
