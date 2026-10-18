import { describe, expect, it } from 'vitest';
import { passwordChangeSchema, signInInputSchema, signUpInputSchema } from '@/lib/auth-schema';

describe('signInInputSchema', () => {
  it('accepts an email and a password, and trims and lowercases the email', () => {
    expect(signInInputSchema.safeParse({ email: '  Me@Example.COM ', password: 'x' })).toMatchObject({
      success: true,
      data: { email: 'me@example.com', password: 'x' },
    });
  });

  it('refuses a bad email and an empty password', () => {
    expect(signInInputSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(signInInputSchema.safeParse({ email: 'me@example.com', password: '' }).success).toBe(false);
  });
});

describe('signUpInputSchema', () => {
  const ok = { name: 'Manas', email: 'me@example.com', password: 'longenough' };

  it('accepts a name, an email and a password of at least 8 characters', () => {
    expect(signUpInputSchema.safeParse(ok).success).toBe(true);
    expect(signUpInputSchema.safeParse({ ...ok, password: '12345678' }).success).toBe(true);
  });

  it('refuses a short password, no name, and a name over 50 characters', () => {
    expect(signUpInputSchema.safeParse({ ...ok, password: '1234567' }).success).toBe(false);
    expect(signUpInputSchema.safeParse({ ...ok, name: '   ' }).success).toBe(false);
    expect(signUpInputSchema.safeParse({ ...ok, name: 'x'.repeat(51) }).success).toBe(false);
  });

  it('names the problem with a code', () => {
    const result = signUpInputSchema.safeParse({ ...ok, password: 'short' });

    expect(!result.success && result.error.issues[0].message).toBe('passwordShort');
  });
});

describe('passwordChangeSchema', () => {
  it('needs the same new password twice, of at least 8 characters', () => {
    expect(passwordChangeSchema.safeParse({ password: 'longenough', confirm: 'longenough' }).success).toBe(true);
    expect(passwordChangeSchema.safeParse({ password: 'longenough', confirm: 'different!' }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ password: 'short', confirm: 'short' }).success).toBe(false);
  });

  it('says when the two do not match', () => {
    const result = passwordChangeSchema.safeParse({ password: 'longenough', confirm: 'different!' });

    expect(!result.success && result.error.issues[0].message).toBe('passwordMismatch');
  });
});
