import { describe, expect, it, vi } from 'vitest';
import { buildContactEmail, sendContactEmail } from '@/server/contact-email';

const env = {
  RESEND_API_KEY: 'key',
  CONTACT_TO_EMAIL: 'owner@test.dev',
  CONTACT_FROM_EMAIL: 'Cadence <hello@test.dev>',
};

describe('buildContactEmail', () => {
  it('names the sender and answers to their address', () => {
    const mail = buildContactEmail({
      message: 'A bug\nin two lines',
      anonymous: false,
      name: 'Alice',
      email: 'a@test.dev',
    });

    expect(mail.subject).toBe('Cadence message from Alice');
    expect(mail.text).toContain('A bug\nin two lines');
    expect(mail.text).toContain('Alice');
    expect(mail.text).toContain('a@test.dev');
    expect(mail.replyTo).toBe('a@test.dev');
  });

  it('says anonymous and carries no identity', () => {
    const mail = buildContactEmail({ message: 'Hi', anonymous: true, name: null, email: null });

    expect(mail.subject).toBe('Cadence message (anonymous)');
    expect(mail.text).toContain('Anonymous');
    expect(mail.replyTo).toBeUndefined();
  });

  it('keeps a name from breaking the subject line', () => {
    const mail = buildContactEmail({ message: 'Hi', anonymous: false, name: 'Eve\r\nBcc: x@y.z', email: null });

    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  it('says so when a named sender left no address', () => {
    expect(buildContactEmail({ message: 'Hi', anonymous: false, name: 'Alice', email: null }).text).toContain(
      'no reply address',
    );
  });
});

describe('sendContactEmail', () => {
  const mail = { subject: 'S', text: 'T', replyTo: 'a@test.dev' };

  it('is skipped, not failed, when the mail service is not set up', async () => {
    const fetcher = vi.fn();

    expect(await sendContactEmail(mail, {}, fetcher)).toBe('skipped');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('posts to Resend with the key and the addresses', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });

    expect(await sendContactEmail(mail, env, fetcher)).toBe('sent');

    const [url, init] = fetcher.mock.calls[0];

    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer key');
    expect(JSON.parse(init.body)).toEqual({
      from: 'Cadence <hello@test.dev>',
      to: ['owner@test.dev'],
      subject: 'S',
      text: 'T',
      reply_to: 'a@test.dev',
    });
  });

  it('reports a refusal or a network error as failed, and never throws', async () => {
    expect(await sendContactEmail(mail, env, vi.fn().mockResolvedValue({ ok: false }))).toBe('failed');
    expect(await sendContactEmail(mail, env, vi.fn().mockRejectedValue(new Error('offline')))).toBe('failed');
  });
});
