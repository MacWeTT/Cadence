import { describe, expect, it } from 'vitest';
import { LINKABLE_PROVIDERS, needsLinking, signInMethods } from '@/lib/sign-in-methods';

describe('signInMethods', () => {
  it('reads the providers Supabase keeps on the account', () => {
    expect(signInMethods(['email'])).toEqual({ password: true, google: false, github: false });
    expect(signInMethods(['email', 'google'])).toEqual({ password: true, google: true, github: false });
    expect(signInMethods(['google'])).toEqual({ password: false, google: true, github: false });
    expect(signInMethods(['github', 'google'])).toEqual({ password: false, google: true, github: true });
  });

  it('knows nothing from nothing', () => {
    expect(signInMethods(undefined)).toEqual({ password: false, google: false, github: false });
    expect(signInMethods([])).toEqual({ password: false, google: false, github: false });
    expect(signInMethods(['phone', 'something-new'])).toEqual({ password: false, google: false, github: false });
  });
});

describe('needsLinking', () => {
  it('is true only for an email and password account with no Google or GitHub linked', () => {
    expect(needsLinking(signInMethods(['email']))).toBe(true);
    expect(needsLinking(signInMethods(['email', 'google']))).toBe(false);
    expect(needsLinking(signInMethods(['email', 'github']))).toBe(false);
  });

  it('is false for an account that has no password (it signs in through Google or GitHub already)', () => {
    expect(needsLinking(signInMethods(['google']))).toBe(false);
    expect(needsLinking(signInMethods([]))).toBe(false);
  });
});

describe('LINKABLE_PROVIDERS', () => {
  it('lists what a person can link', () => {
    expect(LINKABLE_PROVIDERS.length).toBeGreaterThanOrEqual(1);
  });
});
