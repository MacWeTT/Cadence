import { describe, expect, it } from 'vitest';
import { toSharingView } from '@/server/circle-sharing-view';

const READ = '10000000-0000-4000-8000-000000000001';
const WALK = '10000000-0000-4000-8000-000000000002';
const SAM = '00000000-0000-4000-8000-0000000000b2';
const KIM = '00000000-0000-4000-8000-0000000000c3';

const habits = [
  { id: READ, name: 'Read', icon: '📖' },
  { id: WALK, name: 'Walk', icon: '🚶' },
];

describe('toSharingView', () => {
  it('starts every habit hidden, shown by name, when nothing has been shared', () => {
    expect(toSharingView(habits, [], [], false)).toEqual({
      paused: false,
      habits: [
        { id: READ, name: 'Read', icon: '📖', level: 'hidden', label: 'name', showsMisses: false, overrides: [] },
        { id: WALK, name: 'Walk', icon: '🚶', level: 'hidden', label: 'name', showsMisses: false, overrides: [] },
      ],
    });
  });

  it("uses the circle's share for the level and how the habit is shown", () => {
    const view = toSharingView(
      habits,
      [{ habit_id: WALK, level: 'streaks', label: 'emoji', shows_misses: false }],
      [],
      false,
    );

    expect(view.habits[0]).toMatchObject({ id: READ, level: 'hidden', label: 'name' });
    expect(view.habits[1]).toMatchObject({ id: WALK, level: 'streaks', label: 'emoji' });
  });

  it('keeps the order of the habits it is given', () => {
    expect(
      toSharingView(habits, [], [], false).habits.map(h => {
        return h.id;
      }),
    ).toEqual([READ, WALK]);
  });

  it('attaches each person override to its own habit, ordered by person', () => {
    const view = toSharingView(
      habits,
      [],
      [
        { habit_id: READ, viewer_id: SAM, level: 'hidden', label: 'generic' },
        { habit_id: READ, viewer_id: KIM, level: 'done_today', label: 'emoji' },
        { habit_id: WALK, viewer_id: KIM, level: 'everything', label: 'name' },
      ],
      false,
    );

    expect(view.habits[0].overrides).toEqual([
      { viewerId: SAM, level: 'hidden', label: 'generic' },
      { viewerId: KIM, level: 'done_today', label: 'emoji' },
    ]);
    expect(view.habits[1].overrides).toEqual([{ viewerId: KIM, level: 'everything', label: 'name' }]);
  });

  it('carries whether sharing is paused', () => {
    expect(toSharingView(habits, [], [], true).paused).toBe(true);
  });

  it('ignores shares and overrides for a habit that is not in the list, such as an archived one', () => {
    const view = toSharingView(
      habits,
      [{ habit_id: '10000000-0000-4000-8000-0000000000ff', level: 'everything', label: 'name', shows_misses: true }],
      [{ habit_id: '10000000-0000-4000-8000-0000000000ff', viewer_id: SAM, level: 'hidden', label: 'name' }],
      false,
    );

    expect(
      view.habits.every(h => {
        return h.level === 'hidden' && h.overrides.length === 0;
      }),
    ).toBe(true);
  });

  it('treats a level or label it does not know as hidden and by name, rather than guessing', () => {
    const view = toSharingView(
      habits,
      [{ habit_id: READ, level: 'bogus', label: 'bogus', shows_misses: true }],
      [{ habit_id: READ, viewer_id: SAM, level: 'bogus', label: 'bogus' }],
      false,
    );

    expect(view.habits[0]).toMatchObject({ level: 'hidden', label: 'name' });
    expect(view.habits[0].overrides).toEqual([{ viewerId: SAM, level: 'hidden', label: 'generic' }]);
  });

  it('carries the choice to show off days, for a habit shared at Everything only', () => {
    const view = toSharingView(
      habits,
      [
        { habit_id: READ, level: 'everything', label: 'name', shows_misses: true },
        { habit_id: WALK, level: 'streaks', label: 'name', shows_misses: true },
      ],
      [],
      false,
    );

    expect(view.habits[0].showsMisses).toBe(true);
    expect(view.habits[1].showsMisses).toBe(false);
  });
});
