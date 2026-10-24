import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.fn(() => {
  return { auth: {} };
});

vi.mock('@supabase/supabase-js', () => {
  return { createClient };
});

describe('the desktop app Supabase client', () => {
  beforeEach(() => {
    vi.resetModules();
    createClient.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key';
  });

  it('uses the PKCE flow, so Google comes back with a one-time code and never a token in the address', async () => {
    const { cloud } = await import('@/data/local/cloud');

    expect(cloud.auth).toBeDefined();
    expect(createClient).toHaveBeenCalledWith(
      'http://127.0.0.1:54321',
      'test-key',
      expect.objectContaining({
        auth: expect.objectContaining({ flowType: 'pkce', persistSession: true, detectSessionInUrl: false }),
      }),
    );
  });

  it('is not made until it is first used, so the app without the settings still works offline', async () => {
    await import('@/data/local/cloud');

    expect(createClient).not.toHaveBeenCalled();
  });
});
