'use server';

import { getTranslations } from 'next-intl/server';
import { contactInputSchema } from '@/lib/contact-schema';
import { toFieldErrors } from '@/lib/habit-schema';
import { createSupabaseServerClient, getUser } from '@/lib/supabase/server';
import { buildContactEmail, sendContactEmail } from '@/server/contact-email';

export type ContactResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const fail = async (key: 'signIn' | 'contactFailed'): Promise<ContactResult> => {
  const t = await getTranslations('errors');

  return { ok: false, error: t(key) };
};

/**
 * Saves a contact message and emails it to the owner. Only for signed-in users. Anything in the hidden `website` field
 * means a bot: it is told it worked and nothing is saved. The email is a courtesy: the saved copy is what counts, so a
 * failed or unconfigured email does not fail the send.
 * shortcut: no rate limit besides needing an account; add a per-account cap (not stored with anonymous messages) if abused.
 */
export const sendContactAction = async (input: unknown): Promise<ContactResult> => {
  const user = await getUser();

  if (!user) {
    return fail('signIn');
  }

  const { website } = (input ?? {}) as { website?: unknown };

  if (typeof website === 'string' && website.trim() !== '') {
    return { ok: true };
  }

  const parsed = contactInputSchema.safeParse(input);

  if (!parsed.success) {
    const t = await getTranslations('errors');
    const tv = await getTranslations('validation');

    return {
      ok: false,
      error: t('fixFields'),
      fieldErrors: Object.fromEntries(
        Object.entries(toFieldErrors(parsed.error)).map(([field, { code }]) => {
          return [field, tv(code)];
        }),
      ),
    };
  }

  const { data } = parsed;
  const { message, anonymous, name, email } = data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('contact_messages')
    .insert({ message, anonymous, name, email, user_id: anonymous ? null : user.id });

  if (error) {
    console.error(error);

    return fail('contactFailed');
  }

  if ((await sendContactEmail(buildContactEmail(data))) === 'failed') {
    console.error('The contact email could not be sent; the message is saved.');
  }

  return { ok: true };
};
