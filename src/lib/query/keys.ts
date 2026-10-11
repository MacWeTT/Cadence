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
  progressAll: ['progress'] as const,
  /** Progress for one habit filter (`null` is all habits) and one rate window. */
  progress: (habit: string | null, range: number) => {
    return ['progress', habit ?? 'all', range] as const;
  },
};
