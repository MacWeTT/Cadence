import { describe, expect, it } from 'vitest';
import { contactInputSchema } from '@/lib/contact-schema';

const parse = (input: unknown) => {
  return contactInputSchema.safeParse(input);
};

describe('contactInputSchema', () => {
  it('accepts a message alone and trims it', () => {
    const result = parse({ message: '  Hello there  ', anonymous: false });

    expect(result.success && result.data).toEqual({
      message: 'Hello there',
      anonymous: false,
      name: null,
      email: null,
    });
  });

  it('keeps a name and an email when the message is not anonymous', () => {
    const result = parse({ message: 'Hi', anonymous: false, name: ' Alice ', email: 'a@test.dev' });

    expect(result.success && result.data).toEqual({
      message: 'Hi',
      anonymous: false,
      name: 'Alice',
      email: 'a@test.dev',
    });
  });

  it('drops the name and the email of an anonymous message, even if they were sent', () => {
    const result = parse({ message: 'Hi', anonymous: true, name: 'Alice', email: 'a@test.dev' });

    expect(result.success && result.data).toEqual({ message: 'Hi', anonymous: true, name: null, email: null });
  });

  it('treats an empty name or email as not given', () => {
    const result = parse({ message: 'Hi', anonymous: false, name: '   ', email: '' });

    expect(result.success && result.data).toMatchObject({ name: null, email: null });
  });

  it('needs a message, and at most 1000 characters of it', () => {
    expect(parse({ message: '   ', anonymous: true }).error?.issues[0].message).toBe('messageRequired');
    expect(parse({ message: 'x'.repeat(1001), anonymous: true }).error?.issues[0].message).toBe('messageTooLong');
    expect(parse({ message: 'x'.repeat(1000), anonymous: true }).success).toBe(true);
  });

  it('limits the name to 80 characters', () => {
    expect(parse({ message: 'Hi', anonymous: false, name: 'x'.repeat(81) }).error?.issues[0].message).toBe(
      'nameTooLong',
    );
  });

  it('wants a real email address when one is given', () => {
    for (const email of ['alice', 'a@', '@test.dev', 'a b@test.dev']) {
      expect(parse({ message: 'Hi', anonymous: false, email }).error?.issues[0].message, email).toBe('emailInvalid');
    }
  });
});
