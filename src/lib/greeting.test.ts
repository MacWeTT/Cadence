import { describe, expect, it } from 'vitest';
import { chooseGreeting, dayPart, firstName, pickGreeting, type GreetingContext } from './greeting';
import { tr } from './test-translate';

const WEDNESDAY = 3;

const ctx = (over: Partial<GreetingContext> = {}): GreetingContext => {
  return {
    hour: 9,
    weekday: WEDNESDAY,
    allDone: false,
    noneDone: false,
    name: 'Manas Bajpai',
    ...over,
  };
};

const fakeStorage = () => {
  const data = new Map<string, string>();

  return {
    getItem: (k: string) => {
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
};

describe('dayPart', () => {
  it('splits the day at 5, 12, 18 and 22', () => {
    const parts = [4, 5, 11, 12, 17, 18, 21, 22, 0].map(dayPart);

    expect(parts).toEqual([
      'night',
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'evening',
      'evening',
      'night',
      'night',
    ]);
  });
});

describe('firstName', () => {
  it('is the first word, or null when there is none', () => {
    expect(firstName(null)).toBeNull();
    expect(firstName('')).toBeNull();
    expect(firstName('   ')).toBeNull();
    expect(firstName('  Manas Bajpai ')).toBe('Manas');

    const long = 'A'.repeat(60);

    expect(firstName(long)).toBe(long);
  });
});

describe('pickGreeting', () => {
  it('takes the first line of the pool when random is 0', () => {
    const g = pickGreeting(ctx(), () => {
      return 0;
    });

    expect(g.id).toBe('m1');
    expect(tr(g.message)).toBe('Good morning, Manas');
  });

  it('says "friend" when there is no name, and never leaves a placeholder behind', () => {
    expect(
      tr(
        pickGreeting(ctx({ name: null }), () => {
          return 0;
        }).message,
      ),
    ).toBe('Good morning, friend');

    for (const r of [0, 0.5, 0.99]) {
      expect(
        tr(
          pickGreeting(ctx(), () => {
            return r;
          }).message,
        ),
      ).not.toContain('{');
    }
  });

  it('uses only the done lines when everything is ticked', () => {
    for (const r of [0, 0.4, 0.99]) {
      expect(['d1', 'd2']).toContain(
        pickGreeting(ctx({ allDone: true }), () => {
          return r;
        }).id,
      );
    }
  });

  it('does not repeat the last line', () => {
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(
        pickGreeting(
          ctx(),
          () => {
            return r;
          },
          'm1',
        ).id,
      ).not.toBe('m1');
    }
  });

  it('still answers when the pool has a single line and it was the last one', () => {
    expect(
      pickGreeting(
        ctx({ allDone: true }),
        () => {
          return 0;
        },
        'd1',
      ).id,
    ).toBe('d2');
  });

  it('adds the weekday line to the pool', () => {
    const friday = ctx({ hour: 19, weekday: 5 });
    const ids = [0, 0.2, 0.4, 0.6, 0.8, 0.99].map(r => {
      return pickGreeting(friday, () => {
        return r;
      }).id;
    });

    expect(ids).toContain('w5');
  });

  it('offers the fresh-page line only from noon with nothing ticked', () => {
    const seen = (c: GreetingContext) => {
      return [0, 0.2, 0.4, 0.6, 0.8, 0.99].map(r => {
        return pickGreeting(c, () => {
          return r;
        }).id;
      });
    };

    expect(seen(ctx({ hour: 14, noneDone: true }))).toContain('z1');
    expect(seen(ctx({ hour: 9, noneDone: true }))).not.toContain('z1');
  });

  it('uses the night lines late at night', () => {
    expect(
      pickGreeting(ctx({ hour: 23 }), () => {
        return 0;
      }).id,
    ).toBe('n1');
  });

  it('passes a name with special characters through exactly as typed', () => {
    expect(
      tr(
        pickGreeting(ctx({ name: '$&' }), () => {
          return 0;
        }).message,
      ),
    ).toBe('Good morning, $&');
    expect(
      tr(
        pickGreeting(ctx({ name: "$'x" }), () => {
          return 0;
        }).message,
      ),
    ).toBe("Good morning, $'x");
  });
});

describe('chooseGreeting (stable within a session)', () => {
  it('keeps the same line while the day part and state stay the same', () => {
    const storage = fakeStorage();
    const first = chooseGreeting(
      ctx(),
      () => {
        return 0;
      },
      storage,
    );

    for (const r of [0.3, 0.6, 0.99]) {
      expect(
        chooseGreeting(
          ctx(),
          () => {
            return r;
          },
          storage,
        ),
      ).toEqual(first);
    }
  });

  it('picks a different line when the state changes', () => {
    const storage = fakeStorage();
    const before = chooseGreeting(
      ctx({ hour: 9 }),
      () => {
        return 0;
      },
      storage,
    );
    const after = chooseGreeting(
      ctx({ hour: 9, allDone: true }),
      () => {
        return 0;
      },
      storage,
    );

    expect(after.id).not.toBe(before.id);
    expect(['d1', 'd2']).toContain(after.id);
  });

  it('does not repeat the previous line when the day part changes', () => {
    const storage = fakeStorage();
    const morning = chooseGreeting(
      ctx({ hour: 11 }),
      () => {
        return 0;
      },
      storage,
    );
    const noon = chooseGreeting(
      ctx({ hour: 12 }),
      () => {
        return 0;
      },
      storage,
    );

    expect(noon.id).not.toBe(morning.id);
  });

  it('still answers when storage is missing, throws, or holds junk', () => {
    expect(
      chooseGreeting(
        ctx(),
        () => {
          return 0;
        },
        null,
      ).id,
    ).toBe('m1');

    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    expect(
      chooseGreeting(
        ctx(),
        () => {
          return 0;
        },
        broken,
      ).id,
    ).toBe('m1');

    const junk = {
      getItem: () => {
        return '{not json';
      },
      setItem: () => {},
    };

    expect(
      chooseGreeting(
        ctx(),
        () => {
          return 0;
        },
        junk,
      ).id,
    ).toBe('m1');

    const unknownId = {
      getItem: () => {
        return JSON.stringify({ key: 'morning:some', id: 'zzz' });
      },
      setItem: () => {},
    };

    expect(
      chooseGreeting(
        ctx(),
        () => {
          return 0;
        },
        unknownId,
      ).id,
    ).toBe('m1');
  });

  it('keeps a line instead of reshuffling when the first tick moves "none done" to "some done"', () => {
    const storage = fakeStorage();
    const first = chooseGreeting(
      ctx({ hour: 14, noneDone: true }),
      () => {
        return 0;
      },
      storage,
    );

    expect(first.id).toBe('a1');
    expect(
      chooseGreeting(
        ctx({ hour: 14, noneDone: false }),
        () => {
          return 0.99;
        },
        storage,
      ).id,
    ).toBe('a1');
  });

  it('keeps "Fresh page" after the first tick', () => {
    const storage = fakeStorage();
    const first = chooseGreeting(
      ctx({ hour: 14, noneDone: true }),
      () => {
        return 0.99;
      },
      storage,
    );

    expect(first.id).toBe('z1');
    expect(
      chooseGreeting(
        ctx({ hour: 14, noneDone: false }),
        () => {
          return 0;
        },
        storage,
      ).id,
    ).toBe('z1');
  });

  it('inserts a name with special characters as typed, for a kept line too', () => {
    const storage = fakeStorage();

    chooseGreeting(
      ctx({ name: 'Bob' }),
      () => {
        return 0;
      },
      storage,
    );

    expect(
      tr(
        chooseGreeting(
          ctx({ name: '$&' }),
          () => {
            return 0.5;
          },
          storage,
        ).message,
      ),
    ).toBe('Good morning, $&');
  });
});
