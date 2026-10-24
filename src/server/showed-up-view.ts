import { memberName } from '@/lib/circle-people';

/** A friend who showed up today, for the line on Home. */
export interface ShowedUpFriend {
  userId: string;
  name: string;
}

/**
 * Reads the rows of `circles_showed_up_today`: each friend by the name they gave, or their @tag, in alphabetical order
 * so the line on Home reads the same each time.
 */
export const toShowedUpToday = (
  rows: { user_id: string; tag: string; display_name: string | null }[],
): ShowedUpFriend[] => {
  return rows
    .map(({ user_id, tag, display_name }) => {
      return { userId: user_id, name: memberName(display_name, tag) };
    })
    .sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
};
