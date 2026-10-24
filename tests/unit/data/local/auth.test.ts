import { describe, expect, it, vi } from 'vitest';
import { createAuth, type Cloud } from '@/data/local/auth';
import { createGoogle } from '@/data/local/google';

interface Fake {
  rpc: ReturnType<typeof vi.fn>;
  auth: Record<
    | 'signInWithPassword'
    | 'signUp'
    | 'signOut'
    | 'getSession'
    | 'getUser'
    | 'updateUser'
    | 'signInWithOAuth'
    | 'exchangeCodeForSession',
    ReturnType<typeof vi.fn>
  >;
  from: ReturnType<typeof vi.fn>;
  saved: unknown[];
}

/** A stand-in for the Supabase client: only what the sign-in code touches. */
const fake = (over: Partial<Fake> = {}): Fake & Cloud => {
  const saved: unknown[] = [];

  return {
    saved,
    rpc: vi.fn(() => {
      return Promise.resolve({ data: true, error: null });
    }),
    auth: {
      getUser: vi.fn(() => {
        return Promise.resolve({ data: { user: { id: 'u1' } }, error: null });
      }),
      updateUser: vi.fn(() => {
        return Promise.resolve({ error: null });
      }),
      signInWithOAuth: vi.fn(() => {
        return Promise.resolve({ data: { url: 'https://accounts.example/auth' }, error: null });
      }),
      exchangeCodeForSession: vi.fn(() => {
        return Promise.resolve({ error: null });
      }),
      signInWithPassword: vi.fn(() => {
        return Promise.resolve({ error: null });
      }),
      signUp: vi.fn(() => {
        return Promise.resolve({ data: { user: { id: 'u1' }, session: {} }, error: null });
      }),
      signOut: vi.fn(() => {
        return Promise.resolve({ error: null });
      }),
      getSession: vi.fn(() => {
        return Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.co' } } }, error: null });
      }),
    },
    from: vi.fn(() => {
      return {
        update: (patch: unknown) => {
          saved.push(patch);

          return {
            eq: () => {
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    }),
    ...over,
  } as unknown as Fake & Cloud;
};

describe('signing in from the app', () => {
  it('signs in with an email and goes on to where the person was going, or Home for anything unsafe', async () => {
    const cloud = fake();
    const { signIn } = createAuth(cloud);

    expect(await signIn({ mode: 'email', identifier: ' A@B.co ', password: 'secret' }, '/habits')).toEqual({
      next: '/habits',
      error: null,
    });
    expect(cloud.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret' });
    expect(await signIn({ mode: 'email', identifier: 'a@b.co', password: 'secret' }, 'https://evil.example')).toEqual({
      next: '/',
      error: null,
    });
  });

  it('finds the email of a tag through the database, and signs in with it', async () => {
    const cloud = fake({
      rpc: vi.fn(() => {
        return Promise.resolve({ data: [{ email: 'a@b.co', locked: false }], error: null });
      }),
    });

    expect(await createAuth(cloud).signIn({ mode: 'tag', identifier: '@Mac', password: 'secret' }, null)).toEqual({
      next: '/',
      error: null,
    });
    expect(cloud.rpc).toHaveBeenCalledWith('login_email', { p_tag: 'mac', p_password: 'secret' });
    expect(cloud.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret' });
  });

  it('says the same thing for a wrong tag and a wrong password, and says so for a lockout', async () => {
    const unknown = fake({
      rpc: vi.fn(() => {
        return Promise.resolve({ data: [], error: null });
      }),
    });
    const locked = fake({
      rpc: vi.fn(() => {
        return Promise.resolve({ data: [{ email: null, locked: true }], error: null });
      }),
    });
    const wrong = fake();

    wrong.auth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } });

    const input = { mode: 'tag' as const, identifier: 'mac', password: 'x' };
    const failure = { next: null, error: expect.stringContaining("don't match") };

    expect(await createAuth(unknown).signIn(input, null)).toEqual(failure);
    expect(await createAuth(wrong).signIn({ ...input, mode: 'email', identifier: 'a@b.co' }, null)).toEqual(failure);
    expect(await createAuth(locked).signIn(input, null)).toEqual({
      next: null,
      error: expect.stringContaining('Too many'),
    });
  });

  it('refuses input that is not a sign-in before asking the server', async () => {
    const cloud = fake();

    expect(await createAuth(cloud).signIn({ mode: 'email', identifier: 'nope', password: 'x' }, null)).toMatchObject({
      next: null,
      error: expect.any(String),
    });
    expect(cloud.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('answers with the generic message when the network fails', async () => {
    const cloud = fake();

    cloud.auth.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await createAuth(cloud).signIn({ mode: 'email', identifier: 'a@b.co', password: 'x' }, null)).toMatchObject({
      next: null,
      error: expect.stringContaining('went wrong'),
    });
  });
});

describe('creating an account from the app', () => {
  const input = { email: 'a@b.co', tag: 'mac', password: 'longenough', confirm: 'longenough' };

  it('checks the tag, makes the account, and marks it registered with the tag and password', async () => {
    const cloud = fake();

    expect(await createAuth(cloud).signUp(input, null)).toEqual({ next: '/', error: null });
    expect(cloud.rpc).toHaveBeenCalledWith('tag_available', { p_tag: 'mac' });
    expect(cloud.auth.signUp).toHaveBeenCalledWith({ email: 'a@b.co', password: 'longenough' });
    expect(cloud.saved).toEqual([expect.objectContaining({ tag: 'mac', password_set: true })]);
  });

  it('stops at a taken tag or a used email without leaving half an account', async () => {
    const taken = fake({
      rpc: vi.fn(() => {
        return Promise.resolve({ data: false, error: null });
      }),
    });
    const used = fake();

    used.auth.signUp.mockResolvedValue({ data: {}, error: { code: 'user_already_exists' } });

    expect(await createAuth(taken).signUp(input, null)).toMatchObject({
      error: expect.stringContaining('tag is taken'),
    });
    expect(taken.auth.signUp).not.toHaveBeenCalled();
    expect(await createAuth(used).signUp(input, null)).toMatchObject({
      error: expect.stringContaining('already exists'),
    });
    expect(used.saved).toEqual([]);
  });

  it('refuses passwords that differ', async () => {
    expect(await createAuth(fake()).signUp({ ...input, confirm: 'other' }, null)).toMatchObject({ next: null });
  });
});

describe('the session', () => {
  it('says who is signed in, or nobody', async () => {
    const cloud = fake();

    expect(await createAuth(cloud).currentUser()).toEqual({ id: 'u1', email: 'a@b.co' });

    cloud.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    expect(await createAuth(cloud).currentUser()).toBeNull();
  });

  it('reads the stored session, so it works offline, and answers nobody if that fails', async () => {
    const cloud = fake();

    cloud.auth.getSession.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await createAuth(cloud).currentUser()).toBeNull();
  });

  it('signs out', async () => {
    const cloud = fake();

    await createAuth(cloud).signOut();

    expect(cloud.auth.signOut).toHaveBeenCalled();
  });
});

describe('finishing a first Google sign-in on the register screen', () => {
  const input = { tag: '@Mac', password: 'longenough', confirm: 'longenough' };

  it('saves the tag and the password, marks the account registered, and goes on', async () => {
    const cloud = fake();

    expect(await createAuth(cloud).register(input, '/habits')).toEqual({ next: '/habits', error: null });
    expect(cloud.auth.updateUser).toHaveBeenCalledWith({ password: 'longenough' });
    expect(cloud.saved).toEqual([
      expect.objectContaining({ tag: 'mac', password_set: true, registered_at: expect.any(String) }),
    ]);
  });

  it('says a password Supabase turns down, and a tag that is taken, without marking anything', async () => {
    const rejected = fake();
    const taken = fake({
      rpc: vi.fn(() => {
        return Promise.resolve({ data: false, error: null });
      }),
    });

    rejected.auth.updateUser.mockResolvedValue({ error: { code: 'weak_password' } });

    expect(await createAuth(rejected).register(input, null)).toMatchObject({ next: null, error: expect.any(String) });
    expect(rejected.saved).toEqual([]);
    expect(await createAuth(taken).register(input, null)).toMatchObject({
      error: expect.stringContaining('tag is taken'),
    });
    expect(taken.auth.updateUser).not.toHaveBeenCalled();
  });

  it('refuses passwords that differ', async () => {
    expect(await createAuth(fake()).register({ ...input, confirm: 'other' }, null)).toMatchObject({ next: null });
  });

  it('says whether the signed-in account still has to register', async () => {
    const cloud = fake();

    const answer = (registered_at: string | null) => {
      return () => {
        return {
          select: () => {
            return {
              maybeSingle: () => {
                return Promise.resolve({ data: { registered_at }, error: null });
              },
            };
          },
        };
      };
    };

    cloud.from = vi.fn(answer(null)) as never;
    expect(await createAuth(cloud).needsRegistration()).toBe(true);

    cloud.from = vi.fn(answer('2026-10-24T00:00:00Z')) as never;
    expect(await createAuth(cloud).needsRegistration()).toBe(false);
  });
});

describe('Google sign-in through the system browser', () => {
  it('asks Supabase for the sign-in address with the site return page, and opens it in the browser', async () => {
    const cloud = fake();
    const open = vi.fn(() => {
      return Promise.resolve();
    });

    expect(await createGoogle(cloud, 'https://cadence.example', open).start()).toEqual({ error: null });
    expect(cloud.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://cadence.example/auth/desktop', skipBrowserRedirect: true },
    });
    expect(open).toHaveBeenCalledWith('https://accounts.example/auth');
  });

  it('says why when it cannot start', async () => {
    const cloud = fake();

    cloud.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: { message: 'nope' } });

    expect(await createGoogle(cloud, 'https://cadence.example', vi.fn()).start()).toMatchObject({
      error: expect.any(String),
    });
  });

  it('finishes with the code from the link, and says where to go (the register screen for a new account)', async () => {
    const cloud = fake();
    const google = createGoogle(cloud, 'https://cadence.example', vi.fn());

    cloud.from = vi.fn(() => {
      return {
        select: () => {
          return {
            maybeSingle: () => {
              return Promise.resolve({ data: { registered_at: null }, error: null });
            },
          };
        },
      };
    }) as never;

    expect(await google.finish('cadence://auth?code=abc123')).toEqual({ next: '/register', error: null });
    expect(cloud.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('ignores a link that is not a sign-in, and reports a refused one', async () => {
    const cloud = fake();
    const google = createGoogle(cloud, 'https://cadence.example', vi.fn());

    expect(await google.finish('cadence://other')).toBeNull();
    expect(await google.finish('cadence://auth?error=access_denied')).toMatchObject({
      next: null,
      error: expect.any(String),
    });
    expect(cloud.auth.exchangeCodeForSession).not.toHaveBeenCalled();

    cloud.auth.exchangeCodeForSession.mockResolvedValue({ error: { message: 'bad' } });

    expect(await google.finish('cadence://auth?code=abc123')).toMatchObject({ next: null, error: expect.any(String) });
  });
});
