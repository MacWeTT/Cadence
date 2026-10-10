import { describe, expect, it } from 'vitest';
import { chooseGreeting, dayPart, firstName, pickGreeting, type GreetingContext } from './greeting';

const WEDNESDAY = 3;
const ctx = (over: Partial<GreetingContext> = {}): GreetingContext => ({
  hour: 9,
  weekday: WEDNESDAY,
  allDone: false,
  noneDone: false,
  name: 'Manas Bajpai',
  ...over,
});

describe('dayPart', () => {
  it('splits the day at 5, 12, 18 and 22', () => {
    const parts = [4, 5, 11, 12, 17, 18, 21, 22, 0].map(dayPart);
    expect(parts).toEqual(['night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night', 'night']);
  });
});

describe('firstName', () => {
  it('is the first word, or "friend" when there is none', () => {
    expect(firstName(null)).toBe('friend');
    expect(firstName('')).toBe('friend');
    expect(firstName('   ')).toBe('friend');
    expect(firstName('  Manas Bajpai ')).toBe('Manas');
    const long = 'A'.repeat(60);
    expect(firstName(long)).toBe(long);
  });
});

describe('pickGreeting', () => {
  it('takes the first line of the pool when random is 0', () => {
    expect(pickGreeting(ctx(), () => 0)).toEqual({ id: 'm1', text: 'Good morning, Manas' });
  });
  it('never leaves a placeholder behind, with or without a name', () => {
    for (const name of ['Manas', null]) {
      for (const r of [0, 0.5, 0.99]) expect(pickGreeting(ctx({ name }), () => r).text).not.toContain('{name}');
    }
    expect(pickGreeting(ctx({ name: null }), () => 0).text).toBe('Good morning, friend');
  });
  it('uses only the done lines when everything is ticked', () => {
    for (const r of [0, 0.4, 0.99]) expect(['d1', 'd2']).toContain(pickGreeting(ctx({ allDone: true }), () => r).id);
  });
  it('does not repeat the last line', () => {
    for (const r of [0, 0.3, 0.6, 0.99]) expect(pickGreeting(ctx(), () => r, 'm1').id).not.toBe('m1');
  });
  it('still answers when the pool has a single line and it was the last one', () => {
    expect(pickGreeting(ctx({ allDone: true }), () => 0, 'd1').id).toBe('d2');
  });
  it('adds the weekday line to the pool', () => {
    const friday = ctx({ hour: 19, weekday: 5 });
    const ids = [0, 0.2, 0.4, 0.6, 0.8, 0.99].map((r) => pickGreeting(friday, () => r).id);
    expect(ids).toContain('w5');
  });
  it('offers the fresh-page line only from noon with nothing ticked', () => {
    const seen = (c: GreetingContext) => [0, 0.2, 0.4, 0.6, 0.8, 0.99].map((r) => pickGreeting(c, () => r).id);
    expect(seen(ctx({ hour: 14, noneDone: true }))).toContain('z1');
    expect(seen(ctx({ hour: 9, noneDone: true }))).not.toContain('z1');
  });
  it('uses the night lines late at night', () => {
    expect(pickGreeting(ctx({ hour: 23 }), () => 0).id).toBe('n1');
  });
});

describe('chooseGreeting (stable within a session)', () => {
  const fakeStorage = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };

  it('keeps the same line while the day part and state stay the same', () => {
    const storage = fakeStorage();
    const first = chooseGreeting(ctx(), () => 0, storage);
    for (const r of [0.3, 0.6, 0.99]) expect(chooseGreeting(ctx(), () => r, storage)).toEqual(first);
  });
  it('picks a different line when the state changes', () => {
    const storage = fakeStorage();
    const before = chooseGreeting(ctx({ hour: 9 }), () => 0, storage);
    const after = chooseGreeting(ctx({ hour: 9, allDone: true }), () => 0, storage);
    expect(after.id).not.toBe(before.id);
    expect(['d1', 'd2']).toContain(after.id);
  });
  it('does not repeat the previous line when the day part changes', () => {
    const storage = fakeStorage();
    const morning = chooseGreeting(ctx({ hour: 11 }), () => 0, storage);
    const noon = chooseGreeting(ctx({ hour: 12 }), () => 0, storage);
    expect(noon.id).not.toBe(morning.id);
  });
  it('still answers when storage is missing, throws, or holds junk', () => {
    expect(chooseGreeting(ctx(), () => 0, null).id).toBe('m1');
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(chooseGreeting(ctx(), () => 0, broken).id).toBe('m1');
    const junk = { getItem: () => '{not json', setItem: () => {} };
    expect(chooseGreeting(ctx(), () => 0, junk).id).toBe('m1');
    const unknownId = { getItem: () => JSON.stringify({ key: 'morning:some', id: 'zzz' }), setItem: () => {} };
    expect(chooseGreeting(ctx(), () => 0, unknownId).id).toBe('m1');
  });
});

describe('chooseGreeting keeps a line while it still fits', () => {
  it('does not reshuffle when the first tick moves "none done" to "some done"', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    const first = chooseGreeting(ctx({ hour: 14, noneDone: true }), () => 0, storage);
    expect(first.id).toBe('a1');
    expect(chooseGreeting(ctx({ hour: 14, noneDone: false }), () => 0.99, storage).id).toBe('a1');
  });
});

describe('names with special characters', () => {
  it('are inserted as typed, never read as replacement patterns', () => {
    expect(pickGreeting(ctx({ name: '$&' }), () => 0).text).toBe('Good morning, $&');
    expect(pickGreeting(ctx({ name: "$'x" }), () => 0).text).toBe("Good morning, $'x");
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    chooseGreeting(ctx({ name: 'Bob' }), () => 0, storage);
    expect(chooseGreeting(ctx({ name: '$&' }), () => 0.5, storage).text).toBe('Good morning, $&'); // the kept line, too
  });
});
