import { describe, expect, it } from 'vitest';
import { weekTogether } from '@/lib/week-together';
import type { CircleMemberView, SharedHabitView } from '@/server/circles-view';

const ME = '00000000-0000-4000-8000-0000000000a1';
const SAM = '00000000-0000-4000-8000-0000000000b2';
const TODAY = '2026-10-14';

const habit = (missed: string[] | null): SharedHabitView => {
  return {
    name: 'Read',
    icon: '📖',
    level: 'everything',
    done: false,
    showsMisses: missed !== null,
    missed,
    streak: null,
    week: null,
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
    avatar: { kind: 'initial', value: null, color: null, url: null },
    allowCheers: true,
    showedUpWeek: true,
    showedUpDays: [],
    habits: [],
    reactions: [],
    cheersToday: null,
    cheeredByYou: null,
    ...over,
  };
};

const me = member({ userId: ME, tag: 'me', isYou: true, showedUpDays: ['2026-10-12', '2026-10-14'] });

describe('weekTogether', () => {
  it('is the last seven days, oldest first, ending today', () => {
    const together = weekTogether([me, member({})], TODAY);

    expect(together?.days).toEqual([
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
    ]);
  });

  it('has a row for you first and one for your partner, marking the days each showed up', () => {
    const sam = member({ showedUpDays: ['2026-10-12', '2026-10-13'] });
    const together = weekTogether([sam, me], TODAY);

    expect(
      together?.rows.map(row => {
        return row.userId;
      }),
    ).toEqual([ME, SAM]);
    expect(
      together?.rows[0].days
        .filter(day => {
          return day.showed;
        })
        .map(day => {
          return day.date;
        }),
    ).toEqual(['2026-10-12', '2026-10-14']);
  });

  it('counts the days both of you showed up as one number, never who did more', () => {
    const sam = member({ showedUpDays: ['2026-10-12', '2026-10-13'] });

    expect(weekTogether([me, sam], TODAY)?.both).toBe(1);
    expect(weekTogether([me, member({})], TODAY)?.both).toBe(0);
  });

  it('marks a partner off day only where they allowed it and nothing was done that day', () => {
    const sam = member({ showedUpDays: ['2026-10-12'], habits: [habit(['2026-10-10', '2026-10-12'])] });
    const together = weekTogether([me, sam], TODAY);
    const partner = together?.rows[1];

    expect(
      partner?.days
        .filter(day => {
          return day.off;
        })
        .map(day => {
          return day.date;
        }),
    ).toEqual(['2026-10-10']);
  });

  it('marks no off day at all when the partner did not allow it', () => {
    const together = weekTogether([me, member({ habits: [habit(null)] })], TODAY);

    expect(
      together?.rows.every(row => {
        return row.days.every(day => {
          return !day.off;
        });
      }),
    ).toBe(true);
  });

  it('never marks an off day on your own row', () => {
    const mine = member({ userId: ME, isYou: true, habits: [habit(['2026-10-10'])] });
    const together = weekTogether([mine, member({})], TODAY);

    expect(
      together?.rows[0].days.some(day => {
        return day.off;
      }),
    ).toBe(false);
  });

  it('is only for two people', () => {
    expect(weekTogether([me], TODAY)).toBeNull();
    expect(weekTogether([me, member({}), member({ userId: 'x' })], TODAY)).toBeNull();
  });
});
