import { describe, expect, it } from 'vitest';
import { passwordChangeSchema, registerInputSchema } from '@/lib/auth-schema';

describe('passwordChangeSchema', () => {
  it('needs the same new password twice, of at least 8 characters', () => {
    expect(passwordChangeSchema.safeParse({ password: 'longenough', confirm: 'longenough' }).success).toBe(true);
    expect(passwordChangeSchema.safeParse({ password: '12345678', confirm: '12345678' }).success).toBe(true);
    expect(passwordChangeSchema.safeParse({ password: 'longenough', confirm: 'different!' }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ password: 'short', confirm: 'short' }).success).toBe(false);
  });

  it('names the problem with a code', () => {
    const short = passwordChangeSchema.safeParse({ password: 'short', confirm: 'short' });
    const mismatch = passwordChangeSchema.safeParse({ password: 'longenough', confirm: 'different!' });

    expect(!short.success && short.error.issues[0].message).toBe('passwordShort');
    expect(!mismatch.success && mismatch.error.issues[0].message).toBe('passwordMismatch');
  });

  it('refuses a password over 72 characters (what the hash can use)', () => {
    const long = 'x'.repeat(73);
    const result = passwordChangeSchema.safeParse({ password: long, confirm: long });

    expect(!result.success && result.error.issues[0].message).toBe('passwordLong');
  });
});

describe('registerInputSchema', () => {
  const ok = { tag: 'manas_18', password: 'longenough', confirm: 'longenough' };

  it('accepts a tag and a matching password, and tidies the tag like the profile does', () => {
    expect(registerInputSchema.safeParse(ok)).toMatchObject({ success: true, data: { tag: 'manas_18' } });
    expect(registerInputSchema.safeParse({ ...ok, tag: '  @Manas_18 ' })).toMatchObject({
      success: true,
      data: { tag: 'manas_18' },
    });
  });

  it('refuses a tag that breaks the rules, with the same code the profile uses', () => {
    for (const tag of ['ab', 'has space', 'admin', 'x'.repeat(31)]) {
      const result = registerInputSchema.safeParse({ ...ok, tag });

      expect(!result.success && result.error.issues[0].message).toBe('tagInvalid');
    }
  });

  it('refuses a short password and two passwords that differ', () => {
    const short = registerInputSchema.safeParse({ ...ok, password: 'short', confirm: 'short' });
    const mismatch = registerInputSchema.safeParse({ ...ok, confirm: 'different!' });

    expect(!short.success && short.error.issues[0].message).toBe('passwordShort');
    expect(!mismatch.success && mismatch.error.issues[0].message).toBe('passwordMismatch');
  });
});
