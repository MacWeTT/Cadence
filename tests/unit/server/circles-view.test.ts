import { describe, expect, it } from 'vitest';
import { weekProgress } from '@/domain/listing';
import { currentStreak } from '@/domain/streaks';
import type { HabitData } from '@/domain/types';
import { toCircleView } from '@/server/circles-view';

const ME = '00000000-0000-4000-8000-0000000000a1';
const SAM = '00000000-0000-4000-8000-0000000000b2';
const TODAY = '2026-10-12';

const shared = (over: Record<string, unknown> = {}) => {
  return { name: 'Read', icon: '📖', level: 'done_today', done: true, ...over };
};

const member = (over: Record<string, unknown> = {}) => {
  return {
    user_id: SAM,
    tag: 'sam',
    display_name: 'Sam',
    is_you: false,
    paused: false,
    today: TODAY,
    week_starts_on: 1,
    allow_cheers: true,
    in_week: true,
    avatar_kind: 'character',
    avatar_value: 'mage',
    avatar_color: '#6c7d45',
    avatar_url: null,
    showed_up_week: true,
    habits: [],
    cheers_today: null,
    cheered_by_you: false,
    ...over,
  };
};

const overview = (members: unknown[] = [member()], circle: Record<string, unknown> = {}) => {
  return {
    circle: {
      id: '20000000-0000-4000-8000-000000000001',
      name: 'Study group',
      is_owner: true,
      week_ticks: 7,
      ...circle,
    },
    members,
  };
};

const data = (completions: string[], over: Record<string, unknown> = {}) => {
  return {
    start_date: '2026-01-01',
    schedules: [{ kind: 'daily', times_per_week: null, weekdays: null, effective_from: '2026-01-01' }],
    pauses: [],
    completions,
    ...over,
  };
};

const habitData = (completions: string[], over: Partial<HabitData> = {}): HabitData => {
  return {
    startDate: '2026-01-01',
    schedules: [{ kind: 'daily', effectiveFrom: '2026-01-01' }],
    pauses: [],
    completions: new Set(completions),
    ...over,
  };
};

/** The streak the app shows: the domain's, and nothing when it is zero. */
const shownStreak = (h: HabitData, today: string, weekStartsOn: 1 | 7 = 1) => {
  const streak = currentStreak(h, { today, weekStartsOn });

  return streak.count > 0 ? streak : null;
};

const one = (habit: Record<string, unknown>, over: Record<string, unknown> = {}) => {
  return toCircleView(overview([member({ habits: [habit], ...over })])).members[0].habits[0];
};

describe('toCircleView', () => {
  it('maps the circle and a member to what the screens use', () => {
    const view = toCircleView(overview([member({ is_you: true, cheers_today: [] })]));

    expect(view).toMatchObject({
      id: '20000000-0000-4000-8000-000000000001',
      name: 'Study group',
      isOwner: true,
      weekTicks: 7,
    });
    expect(view.members[0]).toMatchObject({
      userId: SAM,
      tag: 'sam',
      displayName: 'Sam',
      isYou: true,
      paused: false,
      allowCheers: true,
      showedUpWeek: true,
      habits: [],
      cheersToday: [],
    });
  });

  it('maps every kind of avatar, with a photo already turned into an initial', () => {
    const avatars = toCircleView(
      overview([
        member({
          avatar_kind: 'google',
          avatar_url: 'https://example.com/a.png',
          avatar_value: null,
          avatar_color: null,
        }),
        member({ avatar_kind: 'emoji', avatar_value: '🦊', avatar_color: '#b8643c' }),
        member({ avatar_kind: 'initial', avatar_value: null, avatar_color: null }),
      ]),
    ).members.map(m => {
      return m.avatar;
    });

    expect(avatars[0]).toEqual({ kind: 'google', value: null, color: null, url: 'https://example.com/a.png' });
    expect(avatars[1]).toEqual({ kind: 'emoji', value: '🦊', color: '#b8643c', url: null });
    expect(avatars[2].kind).toBe('initial');
  });

  it('keeps who cheered you on your own card, and whether you cheered on theirs', () => {
    const view = toCircleView(
      overview([
        member({ user_id: ME, is_you: true, cheers_today: [{ user_id: SAM, tag: 'sam' }], cheered_by_you: null }),
        member({ cheered_by_you: true }),
      ]),
    );

    expect(view.members[0].cheersToday).toEqual([{ userId: SAM, tag: 'sam' }]);
    expect(view.members[0].cheeredByYou).toBeNull();
    expect(view.members[1].cheersToday).toBeNull();
    expect(view.members[1].cheeredByYou).toBe(true);
  });

  it('keeps a paused member with no habits', () => {
    expect(toCircleView(overview([member({ paused: true, showed_up_week: false })])).members[0]).toMatchObject({
      paused: true,
      showedUpWeek: false,
      habits: [],
    });
  });

  it('refuses a payload that is not what the database promises', () => {
    expect(() => {
      return toCircleView(null);
    }).toThrow();
    expect(() => {
      return toCircleView({ circle: { id: 'x' }, members: [] });
    }).toThrow();
    expect(() => {
      return toCircleView(overview([member({ habits: [shared({ level: 'hidden' })] })]));
    }).toThrow();
    expect(() => {
      return toCircleView(overview([member({ today: '2026-02-30' })]));
    }).toThrow();
    expect(() => {
      return toCircleView(overview([member({ avatar_kind: 'robot' })]));
    }).toThrow();
  });

  it('ignores a field it does not know, so the database can grow', () => {
    expect(() => {
      return toCircleView(overview([member({ something_new: 1 })]));
    }).not.toThrow();
  });
});

describe('what each level may show', () => {
  it('shows a habit and its day at Done today, and nothing more', () => {
    expect(one(shared())).toEqual({
      name: 'Read',
      icon: '📖',
      level: 'done_today',
      done: true,
      streak: null,
      week: null,
    });
  });

  it('keeps the name and emoji as the owner chose to show them', () => {
    expect(one(shared({ name: null, icon: '📖' }))).toMatchObject({ name: null, icon: '📖' });
    expect(one(shared({ name: null, icon: null }))).toMatchObject({ name: null, icon: null });
  });

  it('drops any facts that arrive above the level, even if the database sent them', () => {
    const habit = one(shared({ level: 'done_today', data: data(['2026-10-10', '2026-10-11', TODAY]) }));

    expect(habit.streak).toBeNull();
    expect(habit.week).toBeNull();
    expect(habit).not.toHaveProperty('ticks');
  });

  it('shows the streak at Streaks, worked out by the same rules as the owner, and never the dates', () => {
    const days = ['2026-10-10', '2026-10-11', TODAY];
    const habit = one(shared({ level: 'streaks', data: data(days) }));

    expect(habit.streak).toEqual(shownStreak(habitData(days), TODAY));
    expect(habit.streak).toEqual({ unit: 'day', count: 3 });
    expect(habit).not.toHaveProperty('ticks');
  });

  it('adds the ticks, oldest first, only at Everything', () => {
    const habit = one(shared({ level: 'everything', data: data([TODAY, '2026-10-10', '2026-10-11']) }));

    expect(habit).toMatchObject({ ticks: ['2026-10-10', '2026-10-11', TODAY], streak: { unit: 'day', count: 3 } });
  });

  it('shows no streak when there is none, never a streak of nothing', () => {
    expect(one(shared({ level: 'streaks', done: false, data: data(['2026-10-01']) })).streak).toBeNull();
  });

  it('gives a weekly habit its week and a streak counted in weeks', () => {
    const sunday = '2026-10-18';
    const days = ['2026-10-12', '2026-10-14', '2026-10-16'];
    const weekly = data(days, {
      schedules: [{ kind: 'weekly_count', times_per_week: 3, weekdays: null, effective_from: '2026-01-01' }],
    });
    const habit = one(shared({ level: 'streaks', data: weekly }), { today: sunday });
    const expected = habitData(days, {
      schedules: [{ kind: 'weekly_count', timesPerWeek: 3, effectiveFrom: '2026-01-01' }],
    });

    expect(habit.week).toEqual(weekProgress(expected, sunday, { today: sunday, weekStartsOn: 1 }));
    expect(habit.week).toEqual({ done: 3, target: 3, goalMet: true });
    expect(habit.streak).toEqual(shownStreak(expected, sunday));
    expect(habit.streak).toMatchObject({ unit: 'week' });
  });

  it('reads a fixed-weekday habit and an archive pause exactly as the domain does', () => {
    const days = ['2026-10-05', '2026-10-07', '2026-10-12'];
    const fixed = data(days, {
      schedules: [{ kind: 'weekdays', times_per_week: null, weekdays: [1, 3, 5], effective_from: '2026-01-01' }],
      pauses: [{ from: '2026-10-08', to: '2026-10-10' }],
    });
    const expected = habitData(days, {
      schedules: [{ kind: 'weekdays', days: [1, 3, 5], effectiveFrom: '2026-01-01' }],
      pauses: [{ from: '2026-10-08', to: '2026-10-10' }],
    });

    expect(one(shared({ level: 'streaks', data: fixed })).streak).toEqual(shownStreak(expected, TODAY));
  });

  it("uses the member's own today and week start, not the viewer's", () => {
    const days = ['2026-10-11', TODAY];

    expect(one(shared({ level: 'streaks', data: data(days) }), { today: TODAY }).streak).toEqual({
      unit: 'day',
      count: 2,
    });
    // The same ticks, seen on the member's later today: two days have passed unticked, so the streak is gone.
    expect(one(shared({ level: 'streaks', data: data(days) }), { today: '2026-10-14' }).streak).toBeNull();
  });
});
