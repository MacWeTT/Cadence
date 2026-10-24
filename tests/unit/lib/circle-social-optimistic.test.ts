import { describe, expect, it } from 'vitest';
import { withCloser, withLook, withPrefs } from '@/lib/circle-social-optimistic';
import type { CircleMemberView, CircleView } from '@/server/circles-view';

const ME = '00000000-0000-4000-8000-0000000000a1';
const SAM = '00000000-0000-4000-8000-0000000000b2';
const KIM = '00000000-0000-4000-8000-0000000000c3';

const member = (over: Partial<CircleMemberView>): CircleMemberView => {
  return {
    userId: SAM,
    tag: 'sam',
    displayName: 'Sam',
    isYou: false,
    isOwner: false,
    paused: false,
    today: '2026-10-14',
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
    weekTicks: 3,
    members: [member({ userId: ME, isYou: true }), member({ userId: SAM }), member({ userId: KIM, tag: 'kim' })],
  };
};

describe('withPrefs', () => {
  it('sets whether your week counts and whether friends can cheer you, on your own card only', () => {
    const next = withPrefs(view(), false, false);

    expect(next.members[0]).toMatchObject({ inWeek: false, allowCheers: false });
    expect(next.members[1]).toMatchObject({ inWeek: true, allowCheers: true });
  });
});

describe('withLook', () => {
  it('sets the colour and the pin, and nothing else about the circle', () => {
    const next = withLook(view(), 'sky', true);

    expect(next).toMatchObject({ color: 'sky', pinned: true, name: 'Study group' });
    expect(next.members).toEqual(view().members);
  });

  it('does not change the view it was given', () => {
    const before = view();

    withLook(before, 'rose', true);

    expect(before).toEqual(view());
  });
});

describe('withCloser', () => {
  const pair = (): CircleView => {
    return {
      ...view(),
      kind: 'pair',
      members: [member({ userId: ME, isYou: true }), member({ userId: SAM, closer: true })],
    };
  };

  it('sets your own switch, and Closer is on once both are', () => {
    const next = withCloser(pair(), true);

    expect(next.members[0].closer).toBe(true);
    expect(next.members[1].closer).toBe(true);
    expect(next.closerActive).toBe(true);
  });

  it('turning yours off ends it at once, and leaves your partner switch as it was', () => {
    const on = withCloser(pair(), true);
    const off = withCloser(on, false);

    expect(off.closerActive).toBe(false);
    expect(off.members[1].closer).toBe(true);
  });

  it('is never on until your partner has turned theirs on', () => {
    const waiting = { ...pair(), members: [member({ userId: ME, isYou: true }), member({ userId: SAM })] };

    expect(withCloser(waiting, true).closerActive).toBe(false);
  });
});
