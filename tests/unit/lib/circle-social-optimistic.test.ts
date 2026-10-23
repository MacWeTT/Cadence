import { describe, expect, it } from 'vitest';
import { withCheered, withPrefs } from '@/lib/circle-social-optimistic';
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
    avatar: { kind: 'initial', value: null, color: null, url: null },
    allowCheers: true,
    showedUpWeek: true,
    habits: [],
    cheersToday: null,
    cheeredByYou: false,
    ...over,
  };
};

const view = (): CircleView => {
  return {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Study group',
    isOwner: true,
    weekTicks: 3,
    members: [
      member({ userId: ME, isYou: true, cheeredByYou: null, cheersToday: [] }),
      member({ userId: SAM }),
      member({ userId: KIM, tag: 'kim' }),
    ],
  };
};

describe('withCheered', () => {
  it('marks only that friend as cheered today', () => {
    const next = withCheered(view(), SAM);

    expect(next.members[1].cheeredByYou).toBe(true);
    expect(next.members[2].cheeredByYou).toBe(false);
  });

  it('leaves your own card alone and does not change the view it was given', () => {
    const before = view();
    const next = withCheered(before, ME);

    expect(next.members[0].cheeredByYou).toBeNull();
    expect(before).toEqual(view());
  });
});

describe('withPrefs', () => {
  it('sets whether your week counts and whether friends can cheer you, on your own card only', () => {
    const next = withPrefs(view(), false, false);

    expect(next.members[0]).toMatchObject({ inWeek: false, allowCheers: false });
    expect(next.members[1]).toMatchObject({ inWeek: true, allowCheers: true });
  });
});
