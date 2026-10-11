import { describe, expect, it } from 'vitest';
import type { HabitListItem } from '@/server/habit-view';
import { archiveInView, removeFromView, restoreInView } from '@/server/habits-optimistic';
import type { HabitsView } from '@/server/habits';

const habit = (id: string, over: Partial<HabitListItem> = {}): HabitListItem => {
  return {
    id,
    name: id,
    description: null,
    icon: '📖',
    color: 'moss',
    startDate: '2026-10-01',
    archivedAt: null,
    schedule: { kind: 'daily', effectiveFrom: '2026-10-01' },
    pendingSchedule: null,
    hasCompletions: false,
    links: [],
    ...over,
  };
};

const profile: HabitsView['profile'] = { timezone: 'UTC', weekStartsOn: 1, today: '2026-10-11', displayName: null };

const view = (active: HabitListItem[], archived: HabitListItem[] = []): HabitsView => {
  return { active, archived, profile };
};

const ids = (items: HabitListItem[]) => {
  return items.map(item => {
    return item.id;
  });
};

describe('archiveInView', () => {
  it('moves the habit to the archived list and marks it archived', () => {
    const next = archiveInView(
      view([habit('a'), habit('b')], [habit('z', { archivedAt: '2026-10-01T00:00:00Z' })]),
      'a',
      '2026-10-11T08:00:00Z',
    );

    expect(ids(next.active)).toEqual(['b']);
    expect(ids(next.archived)).toEqual(['z', 'a']);
    expect(next.archived[1].archivedAt).toBe('2026-10-11T08:00:00Z');
  });

  it('leaves the view alone for a habit that is not active', () => {
    const before = view([habit('a')]);

    expect(archiveInView(before, 'nope', '2026-10-11T08:00:00Z')).toEqual(before);
  });

  it('does not change the view it was given', () => {
    const before = view([habit('a')]);

    archiveInView(before, 'a', '2026-10-11T08:00:00Z');
    expect(ids(before.active)).toEqual(['a']);
  });
});

describe('restoreInView', () => {
  it('moves the habit back to active and clears its archived mark', () => {
    const next = restoreInView(view([habit('b')], [habit('a', { archivedAt: '2026-10-05T00:00:00Z' })]), 'a');

    expect(ids(next.active)).toEqual(['b', 'a']);
    expect(ids(next.archived)).toEqual([]);
    expect(next.active[1].archivedAt).toBeNull();
  });
});

describe('removeFromView', () => {
  it('drops a habit from either list', () => {
    const next = removeFromView(view([habit('a')], [habit('b', { archivedAt: '2026-10-05T00:00:00Z' })]), 'b');

    expect(ids(next.active)).toEqual(['a']);
    expect(ids(next.archived)).toEqual([]);
  });
});
