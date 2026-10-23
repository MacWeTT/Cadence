/** The cache's keys, one per kind of page data. */
export const queryKeys = {
  habits: ['habits'] as const,
  /** Every Today day. */
  todayAll: ['today'] as const,
  /** One day of Today; `undefined` is the page without a `?date=`, which is today. */
  today: (date: string | undefined) => {
    return ['today', date ?? 'now'] as const;
  },
  home: ['home'] as const,
  /** How much the account holds (habits, check-ins, focus sessions), for the Account tab. */
  account: ['account'] as const,
  /** The person's profile: name, avatar, timezone, week start, sound and custom sounds. */
  profile: ['profile'] as const,
  /** The running focus session and the last-used numbers per habit. */
  focus: ['focus'] as const,
  /** The circles the person is in. */
  circles: ['circles'] as const,
  /** One circle as the person may see it. */
  circle: (id: string) => {
    return ['circles', id] as const;
  },
  /** What the person shares with one circle (their habits, levels and overrides). */
  circleSharing: (id: string) => {
    return ['circles', id, 'sharing'] as const;
  },
  progressAll: ['progress'] as const,
  /** Progress for one habit filter (`null` is all habits) and one rate window. */
  progress: (habit: string | null, range: number) => {
    return ['progress', habit ?? 'all', range] as const;
  },
};
