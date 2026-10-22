import { describe, expect, it } from 'vitest';
import { passwordChangeSchema, registerInputSchema, signInInputSchema, signUpInputSchema } from '@/lib/auth-schema';

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

const firstIssue = (result: { success: boolean; error?: { issues: { message: string }[] } }) => {
  return result.success ? null : result.error?.issues[0].message;
};

describe('signInInputSchema', () => {
  it('reads a tag the way the profile does: without the @, spaces or capitals', () => {
    expect(signInInputSchema.safeParse({ mode: 'tag', identifier: '  @Manas_18 ', password: 'x' })).toMatchObject({
      success: true,
      data: { mode: 'tag', identifier: 'manas_18', password: 'x' },
    });
  });

  it('reads an email without spaces or capitals', () => {
    expect(signInInputSchema.safeParse({ mode: 'email', identifier: ' Me@Example.COM ', password: 'x' })).toMatchObject(
      {
        success: true,
        data: { mode: 'email', identifier: 'me@example.com' },
      },
    );
  });

  it('keeps the password exactly as typed', () => {
    const result = signInInputSchema.safeParse({ mode: 'tag', identifier: 'manas', password: '  spaced  ' });

    expect(result).toMatchObject({ success: true, data: { password: '  spaced  ' } });
  });

  it('asks for something to be typed, in both modes', () => {
    expect(firstIssue(signInInputSchema.safeParse({ mode: 'tag', identifier: ' @ ', password: 'x' }))).toBe(
      'identifierRequired',
    );
    expect(firstIssue(signInInputSchema.safeParse({ mode: 'email', identifier: '', password: 'x' }))).toBe(
      'identifierRequired',
    );
    expect(firstIssue(signInInputSchema.safeParse({ mode: 'tag', identifier: 'manas', password: '' }))).toBe(
      'passwordRequired',
    );
  });

  it('refuses something that is not an email in email mode, and nothing else is checked in tag mode', () => {
    expect(firstIssue(signInInputSchema.safeParse({ mode: 'email', identifier: 'manas', password: 'x' }))).toBe(
      'authEmailInvalid',
    );
    expect(signInInputSchema.safeParse({ mode: 'tag', identifier: 'x', password: 'x' }).success).toBe(true);
  });

  it('refuses a mode that is not tag or email', () => {
    expect(signInInputSchema.safeParse({ mode: 'phone', identifier: 'x', password: 'x' }).success).toBe(false);
  });
});

describe('signUpInputSchema', () => {
  const ok = { email: 'me@example.com', tag: 'manas_18', password: 'longenough', confirm: 'longenough' };

  it('accepts an email, a tag and a matching password, and tidies the email and the tag', () => {
    expect(signUpInputSchema.safeParse(ok).success).toBe(true);
    expect(signUpInputSchema.safeParse({ ...ok, email: ' Me@Example.COM ', tag: '@Manas_18' })).toMatchObject({
      success: true,
      data: { email: 'me@example.com', tag: 'manas_18' },
    });
  });

  it('names what is wrong with a code', () => {
    expect(firstIssue(signUpInputSchema.safeParse({ ...ok, email: 'nope' }))).toBe('authEmailInvalid');
    expect(firstIssue(signUpInputSchema.safeParse({ ...ok, tag: 'ab' }))).toBe('tagInvalid');
    expect(firstIssue(signUpInputSchema.safeParse({ ...ok, password: 'short', confirm: 'short' }))).toBe(
      'passwordShort',
    );
    expect(firstIssue(signUpInputSchema.safeParse({ ...ok, confirm: 'different!' }))).toBe('passwordMismatch');
  });
});
