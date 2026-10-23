import { isLabel, isLevel, type Label, type Level } from '@/domain/circles';

/** One person's own level for a habit, in place of the circle's. */
export interface ShareOverrideView {
  viewerId: string;
  level: Level;
  label: Label;
}

/** One of my habits and how much of it a circle sees. */
export interface SharedByMeView {
  id: string;
  name: string;
  icon: string;
  level: Level;
  label: Label;
  overrides: ShareOverrideView[];
}

/** What I share with one circle: my habits, and whether sharing is paused for everyone. */
export interface SharingView {
  paused: boolean;
  habits: SharedByMeView[];
}

interface HabitRow {
  id: string;
  name: string;
  icon: string;
}

interface ShareRow {
  habit_id: string;
  level: string;
  label: string;
}

interface OverrideRow {
  habit_id: string;
  viewer_id: string;
  level: string;
  label: string;
}

/** A value the database holds that this code does not know is read as the safest one, never guessed upward. */
const levelOf = (value: string): Level => {
  return isLevel(value) ? value : 'hidden';
};

const labelOf = (value: string, fallback: Label): Label => {
  return isLabel(value) ? value : fallback;
};

const byViewer = (a: ShareOverrideView, b: ShareOverrideView): number => {
  return a.viewerId.localeCompare(b.viewerId);
};

/** Joins my habits with the shares and overrides for one circle. A habit with no share row is hidden. */
export const toSharingView = (
  habits: HabitRow[],
  shares: ShareRow[],
  overrides: OverrideRow[],
  paused: boolean,
): SharingView => {
  return {
    paused,
    habits: habits.map(({ id, name, icon }) => {
      const { level: shareLevel, label: shareLabel } = shares.find(row => {
        return row.habit_id === id;
      }) ?? { level: 'hidden', label: 'name' };

      return {
        id,
        name,
        icon,
        level: levelOf(shareLevel),
        label: labelOf(shareLabel, 'name'),
        overrides: overrides
          .filter(row => {
            return row.habit_id === id;
          })
          .map(({ viewer_id, level, label }) => {
            return { viewerId: viewer_id, level: levelOf(level), label: labelOf(label, 'generic') };
          })
          .sort(byViewer),
      };
    }),
  };
};
