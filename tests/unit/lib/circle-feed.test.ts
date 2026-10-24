import { describe, expect, it } from 'vitest';
import { buildFeed } from '@/lib/circle-feed';
import type { CircleMemberView, SharedHabitView } from '@/server/circles-view';

const ME = '00000000-0000-4000-8000-0000000000a1';
const SAM = '00000000-0000-4000-8000-0000000000b2';
const KIM = '00000000-0000-4000-8000-0000000000c3';
const TODAY = '2026-10-14';

const habit = (over: Partial<SharedHabitView> = {}): SharedHabitView => {
  return {
    name: 'Walk',
    icon: '🚶',
    level: 'done_today',
    done: true,
    streak: null,
    week: null,
    showsMisses: false,
    missed: null,
    ...over,
  };
};

const member = (over: Partial<CircleMemberView>): CircleMemberView => {
  return {
    userId: SAM,
    tag: 'sam',
    displayName: 'Sam',
    isYou: false,
    isOwner: false,
    paused: false,
    today: TODAY,
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

const me = member({ userId: ME, tag: 'me', isYou: true });

describe('buildFeed', () => {
  it("makes one bubble for a friend's day, holding only the habits they did", () => {
    const sam = member({ habits: [habit(), habit({ name: 'Read', icon: '📖', done: false })] });
    const feed = buildFeed([me, sam], TODAY);

    expect(feed).toHaveLength(1);
    expect(feed[0].bubbles).toHaveLength(1);
    expect(feed[0].bubbles[0].habits).toEqual([{ name: 'Walk', icon: '🚶', streak: null }]);
  });

  it('has nothing for a paused friend or a friend who did nothing', () => {
    const paused = member({ userId: SAM, paused: true, habits: [habit()] });
    const idle = member({ userId: KIM, tag: 'kim', habits: [habit({ done: false })] });

    expect(buildFeed([me, paused, idle], TODAY)).toEqual([]);
  });

  it('shows your own day too, as the circle sees it, so you can see the reactions it got', () => {
    const mine = member({
      userId: ME,
      tag: 'me',
      isYou: true,
      habits: [habit()],
      reactions: [{ userId: SAM, tag: 'sam', date: TODAY, emoji: '🔥' }],
    });
    const [day] = buildFeed([mine], TODAY);

    expect(day.bubbles[0].member.isYou).toBe(true);
    expect(day.bubbles[0].habits).toHaveLength(1);
    expect(day.bubbles[0].reactions).toEqual([{ emoji: '🔥', count: 1, mine: false, who: ['sam'] }]);
  });

  it('shows the earlier days of a habit shared with its history, the last six days only', () => {
    const sam = member({
      habits: [habit({ done: false, level: 'everything', ticks: ['2026-10-13', '2026-10-08', '2026-10-07'] })],
    });
    const feed = buildFeed([me, sam], TODAY);

    expect(
      feed.map(day => {
        return day.date;
      }),
    ).toEqual(['2026-10-08', '2026-10-13']);
  });

  it('takes today from the done flag, not from the ticks, and puts the streak on today only', () => {
    const sam = member({
      habits: [habit({ level: 'everything', streak: { unit: 'day', count: 5 }, ticks: [TODAY, '2026-10-13'] })],
    });
    const [yesterday, today] = buildFeed([me, sam], TODAY);

    expect(yesterday.bubbles[0].habits[0].streak).toBeNull();
    expect(today.bubbles[0].habits[0].streak).toEqual({ unit: 'day', count: 5 });
  });

  it('lists the days oldest first, and names today and yesterday', () => {
    const sam = member({ habits: [habit({ level: 'everything', ticks: ['2026-10-13', '2026-10-10'] })] });
    const feed = buildFeed([me, sam], TODAY);

    expect(
      feed.map(day => {
        return day.when;
      }),
    ).toEqual(['earlier', 'yesterday', 'today']);
  });

  it("counts a friend's day that has already turned as today", () => {
    const sam = member({ today: '2026-10-15', habits: [habit()] });
    const feed = buildFeed([me, sam], TODAY);

    expect(feed[0].when).toBe('today');
  });

  it('keeps a habit shown as just a habit with no name and no emoji', () => {
    const sam = member({ habits: [habit({ name: null, icon: null })] });

    expect(buildFeed([me, sam], TODAY)[0].bubbles[0].habits).toEqual([{ name: null, icon: null, streak: null }]);
  });

  it('groups the reactions on a day by emoji, in the usual order, with who gave them and which are yours', () => {
    const sam = member({
      habits: [habit()],
      reactions: [
        { userId: KIM, tag: 'kim', date: TODAY, emoji: '🔥' },
        { userId: ME, tag: 'me', date: TODAY, emoji: '🔥' },
        { userId: KIM, tag: 'kim', date: TODAY, emoji: '👏' },
        { userId: KIM, tag: 'kim', date: '2026-10-12', emoji: '💪' },
      ],
    });
    const [day] = buildFeed([me, sam], TODAY);

    expect(day.bubbles[0].reactions).toEqual([
      { emoji: '👏', count: 1, mine: false, who: ['kim'] },
      { emoji: '🔥', count: 2, mine: true, who: ['kim', 'me'] },
    ]);
  });

  it('has no bubble for a day with reactions but nothing shared', () => {
    const sam = member({ habits: [], reactions: [{ userId: KIM, tag: 'kim', date: TODAY, emoji: '🔥' }] });

    expect(buildFeed([me, sam], TODAY)).toEqual([]);
  });

  it('adds the habits that did not happen to a day that has a bubble, only where the partner allowed it', () => {
    const sam = member({
      habits: [
        habit(),
        habit({ name: 'Run', icon: '🏃', done: false, showsMisses: true, missed: [TODAY, '2026-10-13'] }),
      ],
    });
    const [day] = buildFeed([me, sam], TODAY);

    expect(day.bubbles[0].off).toEqual([{ name: 'Run', icon: '🏃' }]);
  });

  it('has no off days when nothing was allowed', () => {
    const sam = member({ habits: [habit({ done: true, missed: null })] });

    expect(buildFeed([me, sam], TODAY)[0].bubbles[0].off).toEqual([]);
  });
});
