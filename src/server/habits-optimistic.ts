// Pure updates to the cached Habits view, for answering a tap before the server has: archive, restore and delete.
// Kept free of `server-only` imports so they can be unit-tested.
import type { HabitListItem } from '@/server/habit-view';
import type { HabitsView } from '@/server/habits';

const without = (items: HabitListItem[], id: string) => {
  return items.filter(item => {
    return item.id !== id;
  });
};

const find = (items: HabitListItem[], id: string) => {
  return items.find(item => {
    return item.id === id;
  });
};

/** Moves an active habit to the archived list, marked archived at `archivedAt`. */
export const archiveInView = (view: HabitsView, id: string, archivedAt: string): HabitsView => {
  const { active, archived } = view;
  const habit = find(active, id);

  if (!habit) {
    return view;
  }

  return { ...view, active: without(active, id), archived: [...archived, { ...habit, archivedAt }] };
};

/** Moves an archived habit back to the active list. */
export const restoreInView = (view: HabitsView, id: string): HabitsView => {
  const { active, archived } = view;
  const habit = find(archived, id);

  if (!habit) {
    return view;
  }

  return { ...view, active: [...active, { ...habit, archivedAt: null }], archived: without(archived, id) };
};

/** Drops a habit from whichever list it is in. */
export const removeFromView = (view: HabitsView, id: string): HabitsView => {
  const { active, archived } = view;

  return { ...view, active: without(active, id), archived: without(archived, id) };
};
