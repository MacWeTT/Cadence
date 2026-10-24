import { describe, expect, it } from 'vitest';
import { withReaction } from '@/lib/circle-social-optimistic';
import type { CircleMemberView, CircleView } from '@/server/circles-view';

const ME = '00000000-0000-4000-8000-0000000000a1';
const SAM = '00000000-0000-4000-8000-0000000000b2';
const KIM = '00000000-0000-4000-8000-0000000000c3';
const DAY = '2026-10-14';

const member = (over: Partial<CircleMemberView>): CircleMemberView => {
  return {
    userId: SAM,
    tag: 'sam',
    displayName: 'Sam',
    isYou: false,
    isOwner: false,
    paused: false,
    today: DAY,
    inWeek: true,
    closer: false,
    showedUpDays: [],
    avatar: { kind: 'initial', value: null, color: null, url: null },
    allowCheers: true,
    showedUpWeek: true,
    habits: [],
    reactions: [],
    ...over,
  };
};

const view = (): CircleView => {
  return {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Study group',
    color: 'moss',
    pinned: false,
    kind: 'group',
    closerActive: false,
    isOwner: true,
    weekTicks: 0,
    members: [
      member({ userId: ME, tag: 'me', isYou: true }),
      member({ userId: SAM, reactions: [{ userId: KIM, tag: 'kim', date: DAY, emoji: '🔥' }] }),
    ],
  };
};

const give = (emoji: '👏' | '🔥' | '💪' | '❤️', on: boolean) => {
  return { me: ME, myTag: 'me', toUser: SAM, date: DAY, emoji, on };
};

describe('withReaction', () => {
  it('adds your reaction to that friend and day, with your tag', () => {
    const next = withReaction(view(), give('👏', true));

    expect(next.members[1].reactions).toEqual([
      { userId: KIM, tag: 'kim', date: DAY, emoji: '🔥' },
      { userId: ME, tag: 'me', date: DAY, emoji: '👏' },
    ]);
  });

  it('adding the same reaction twice does not double it', () => {
    const twice = withReaction(withReaction(view(), give('👏', true)), give('👏', true));

    expect(twice.members[1].reactions).toHaveLength(2);
  });

  it('takes back only your own reaction of that emoji on that day', () => {
    const added = withReaction(view(), give('🔥', true));
    const removed = withReaction(added, give('🔥', false));

    expect(removed.members[1].reactions).toEqual([{ userId: KIM, tag: 'kim', date: DAY, emoji: '🔥' }]);
  });

  it('does not change the view it was given', () => {
    const before = view();

    withReaction(before, give('💪', true));

    expect(before).toEqual(view());
  });
});
