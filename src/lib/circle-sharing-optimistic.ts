import type { Label, Level } from '@/domain/circles';
import type { SharedByMeView, SharingView } from '@/server/circle-sharing-view';

/** Changes one habit and returns a new view; the one it was given is left alone. */
const mapHabit = (view: SharingView, habitId: string, change: (habit: SharedByMeView) => SharedByMeView) => {
  return {
    ...view,
    habits: view.habits.map(habit => {
      return habit.id === habitId ? change(habit) : habit;
    }),
  };
};

/** The screen's guess at the result of `set_share`, shown before the server answers. */
export const withShare = (view: SharingView, habitId: string, level: Level, label?: Label): SharingView => {
  return mapHabit(view, habitId, habit => {
    return { ...habit, level, label: label ?? habit.label };
  });
};

/** The guess for `set_share_override`: `inherit` removes the person's override, anything else replaces it. */
export const withOverride = (
  view: SharingView,
  habitId: string,
  viewerId: string,
  level: Level | 'inherit',
  label: Label,
): SharingView => {
  return mapHabit(view, habitId, habit => {
    const others = habit.overrides.filter(override => {
      return override.viewerId !== viewerId;
    });

    if (level === 'inherit') {
      return { ...habit, overrides: others };
    }

    const overrides = [...others, { viewerId, level, label }].sort((a, b) => {
      return a.viewerId.localeCompare(b.viewerId);
    });

    return { ...habit, overrides };
  });
};

export const withPaused = (view: SharingView, paused: boolean): SharingView => {
  return { ...view, paused };
};
