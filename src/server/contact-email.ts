import type { ContactInput } from '@/lib/contact-schema';

// This email is for the person who runs Cadence, not for its users, so it is plain English and not in the message files.

interface Mail {
  subject: string;
  text: string;
  replyTo?: string;
}

/** The email that tells the owner about a message. */
export const buildContactEmail = (input: ContactInput): Mail => {
  const { message, anonymous, name, email } = input;

  // A name never gets to add a line to the subject.
  const who = anonymous ? 'anonymous' : (name?.replace(/[\r\n]+/g, ' ').trim() ?? '');
  const from = anonymous
    ? 'Anonymous'
    : [name, email ?? (name ? '(no reply address)' : null)].filter(Boolean).join(' ');

  return {
    subject: anonymous || !who ? `Cadence message${anonymous ? ' (anonymous)' : ''}` : `Cadence message from ${who}`,
    text: `${message}\n\n--\nFrom: ${from || 'Someone who left no name'}`,
    replyTo: email ?? undefined,
  };
};

type MailEnv = Record<string, string | undefined>;

type Fetcher = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean }>;

/** Sends it with Resend. `skipped` when the service is not set up (the message is still saved); never throws. */
export const sendContactEmail = async (
  mail: Mail,
  env: MailEnv = process.env,
  fetcher: Fetcher = fetch,
): Promise<'sent' | 'skipped' | 'failed'> => {
  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = env;

  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    return 'skipped';
  }

  const { subject, text, replyTo } = mail;

  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    return response.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
};
