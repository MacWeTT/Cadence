import { describe, expect, it, vi } from 'vitest';
import { createAuth, type Cloud } from '@/data/local/auth';

interface Fake {
  rpc: ReturnType<typeof vi.fn>;
  auth: Record<'signInWithPassword' | 'signUp' | 'signOut' | 'getSession', ReturnType<typeof vi.fn>>;
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
