import { describe, expect, it } from 'vitest';
import { toShowedUpToday } from '@/server/showed-up-view';

const SAM = '00000000-0000-4000-8000-0000000000b2';
const KIM = '00000000-0000-4000-8000-0000000000c3';

describe('toShowedUpToday', () => {
  it('names each friend by the name they gave, trimmed, or their @tag when they gave none', () => {
    expect(
      toShowedUpToday([
        { user_id: SAM, tag: 'sam', display_name: ' Sam ' },
        { user_id: KIM, tag: 'kim', display_name: null },
      ]),
    ).toEqual([
      { userId: KIM, name: '@kim' },
      { userId: SAM, name: 'Sam' },
    ]);
  });

  it('lists them in alphabetical order, so the line reads the same each time', () => {
    const names = toShowedUpToday([
      { user_id: KIM, tag: 'zed', display_name: 'Zed' },
      { user_id: SAM, tag: 'amy', display_name: 'Amy' },
    ]).map(({ name }) => {
      return name;
    });

    expect(names).toEqual(['Amy', 'Zed']);
  });

  it('is empty when nobody showed up', () => {
    expect(toShowedUpToday([])).toEqual([]);
  });
});
