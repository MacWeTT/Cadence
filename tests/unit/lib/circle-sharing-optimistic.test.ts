import { describe, expect, it } from 'vitest';
import { withMisses, withOverride, withPaused, withShare } from '@/lib/circle-sharing-optimistic';
import type { SharingView } from '@/server/circle-sharing-view';

const READ = '10000000-0000-4000-8000-000000000001';
const WALK = '10000000-0000-4000-8000-000000000002';
const SAM = '00000000-0000-4000-8000-0000000000b2';
const KIM = '00000000-0000-4000-8000-0000000000c3';

const view = (): SharingView => {
  return {
    paused: false,
    habits: [
      { id: READ, name: 'Read', icon: '📖', level: 'hidden', label: 'name', showsMisses: false, overrides: [] },
      {
        id: WALK,
        name: 'Walk',
        icon: '🚶',
        level: 'done_today',
        label: 'emoji',
        showsMisses: true,
        overrides: [{ viewerId: SAM, level: 'hidden', label: 'generic' }],
      },
    ],
  };
};

describe('withShare', () => {
  it('sets the level and how the habit is shown, on that habit only', () => {
    const next = withShare(view(), READ, 'streaks', 'generic');

    expect(next.habits[0]).toMatchObject({ level: 'streaks', label: 'generic' });
    expect(next.habits[1]).toMatchObject({ level: 'done_today', label: 'emoji' });
  });

  it('keeps how the habit was shown when only the level changes', () => {
    expect(withShare(view(), WALK, 'everything').habits[1]).toMatchObject({ level: 'everything', label: 'emoji' });
  });

  it('changes nothing for a habit that is not there', () => {
    expect(withShare(view(), '10000000-0000-4000-8000-0000000000ff', 'everything')).toEqual(view());
  });

  it('does not change the view it was given', () => {
    const before = view();

    withShare(before, READ, 'everything');

    expect(before).toEqual(view());
  });
});

describe('withOverride', () => {
  it('adds a person override to a habit', () => {
    const next = withOverride(view(), READ, KIM, 'done_today', 'emoji');

    expect(next.habits[0].overrides).toEqual([{ viewerId: KIM, level: 'done_today', label: 'emoji' }]);
  });

  it("replaces that person's earlier override, and leaves other people's alone", () => {
    const next = withOverride(view(), WALK, SAM, 'everything', 'name');

    expect(next.habits[1].overrides).toEqual([{ viewerId: SAM, level: 'everything', label: 'name' }]);
    expect(withOverride(next, WALK, KIM, 'hidden', 'generic').habits[1].overrides).toHaveLength(2);
  });

  it('removes the override on inherit, so the circle level applies again', () => {
    expect(withOverride(view(), WALK, SAM, 'inherit', 'generic').habits[1].overrides).toEqual([]);
  });

  it('keeps the overrides ordered by person', () => {
    const next = withOverride(withOverride(view(), READ, SAM, 'hidden', 'generic'), READ, KIM, 'hidden', 'generic');

    expect(
      next.habits[0].overrides.map(o => {
        return o.viewerId;
      }),
    ).toEqual([SAM, KIM]);
  });
});

describe('withPaused', () => {
  it('turns pausing on and off and touches nothing else', () => {
    const next = withPaused(view(), true);

    expect(next.paused).toBe(true);
    expect(next.habits).toEqual(view().habits);
    expect(withPaused(next, false).paused).toBe(false);
  });
});

describe('withMisses', () => {
  it('sets the choice to show off days on that habit only', () => {
    const next = withMisses(view(), READ, true);

    expect(next.habits[0].showsMisses).toBe(true);
    expect(next.habits[1].showsMisses).toBe(true);
    expect(withMisses(next, READ, false).habits[0].showsMisses).toBe(false);
  });
});

describe('withShare and off days', () => {
  it('clears the choice when a habit is lowered below Everything, as the database does', () => {
    const everything = withShare(view(), WALK, 'everything');

    expect(everything.habits[1].showsMisses).toBe(true);
    expect(withShare(everything, WALK, 'streaks').habits[1].showsMisses).toBe(false);
    expect(withShare(everything, WALK, 'hidden').habits[1].showsMisses).toBe(false);
  });
});
