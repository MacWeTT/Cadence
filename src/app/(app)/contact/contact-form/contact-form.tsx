'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { MESSAGE_LIMIT } from '@/lib/contact-schema';
import { sendContactAction } from '@/app/(app)/contact/actions';
import { CharacterLimit } from '@/components/character-limit/character-limit';
import { AnimatedError } from '@/components/animated-error/animated-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import './contact-form.css';

interface ContactFormProps {
  /** The signed-in user's name and email, offered as the answer address; they can change or remove them. */
  name: string;
  email: string;
}

interface ContactFormState {
  message: string;
  anonymous: boolean;
  name: string;
  email: string;
  /** The hidden field only a bot fills in. */
  website: string;
  errors: Record<string, string>;
  failure: string | null;
  sent: boolean;
}

/** Write to the owner: with a name and an email to answer, or anonymously. */
export const ContactForm = (props: ContactFormProps) => {
  const { name, email } = props;

  const [state, setState] = useState<ContactFormState>({
    message: '',
    anonymous: false,
    name,
    email,
    website: '',
    errors: {},
    failure: null,
    sent: false,
  });

  const t = useTranslations('contact');
  const [pending, startTransition] = useTransition();

  const { message, anonymous, website, errors, failure, sent, name: nameValue, email: emailValue } = state;
  const { message: messageError, name: nameError, email: emailError } = errors;

  const setField = <K extends keyof ContactFormState>(field: K, value: ContactFormState[K]) => {
    setState(current => {
      return { ...current, [field]: value };
    });
  };

  const onMessageChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setField('message', event.target.value.slice(0, MESSAGE_LIMIT));
  };

  const onAnonymousChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setField('anonymous', event.target.checked);
  };

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setField('name', event.target.value);
  };

  const onEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setField('email', event.target.value);
  };

  const onWebsiteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setField('website', event.target.value);
  };

  const onAgain = () => {
    setState(current => {
      return { ...current, message: '', sent: false, errors: {}, failure: null };
    });
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await sendContactAction({
        message,
        anonymous,
        name: nameValue,
        email: emailValue,
        website,
      });

      setState(current => {
        if (result.ok) {
          return { ...current, sent: true, errors: {}, failure: null };
        }

        const { fieldErrors, error } = result;

        return { ...current, errors: fieldErrors ?? {}, failure: fieldErrors ? null : error };
      });
    });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sent ? (
        <motion.div
          key="thanks"
          role="status"
          className="contact-form__thanks"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <h2 className="contact-form__thanks-title">{t('thanksTitle')}</h2>
          <p className="contact-form__thanks-text">{t('thanksText')}</p>
          <Button type="button" variant="outline" onClick={onAgain}>
            {t('again')}
          </Button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={onSubmit}
          noValidate
          className="contact-form"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <div>
            <Label htmlFor="contact-message">{t('message')}</Label>
            <div className="contact-form__box">
              <Textarea
                id="contact-message"
                value={message}
                onChange={onMessageChange}
                rows={6}
                maxLength={MESSAGE_LIMIT}
                aria-invalid={Boolean(messageError)}
                aria-describedby={messageError ? 'contact-message-error' : undefined}
                className="contact-form__message"
              />
              <div className="contact-form__limit">
                <CharacterLimit count={message.length} limit={MESSAGE_LIMIT} />
              </div>
            </div>
            <AnimatedError id="contact-message-error" message={messageError} />
          </div>

          <label className="contact-form__anonymous">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={onAnonymousChange}
              className="contact-form__checkbox"
            />
            <span>
              <span className="contact-form__anonymous-label">{t('anonymous')}</span>
              <span className="contact-form__hint">{t('anonymousHint')}</span>
            </span>
          </label>

          <motion.div
            className="contact-form__who"
            animate={{ opacity: anonymous ? 0.5 : 1 }}
            transition={{ duration: 0.25 }}
          >
            <div>
              <Label htmlFor="contact-name">{t('name')}</Label>
              <Input
                id="contact-name"
                value={nameValue}
                onChange={onNameChange}
                disabled={anonymous}
                aria-invalid={Boolean(nameError)}
              />
              <AnimatedError message={nameError} />
            </div>
            <div>
              <Label htmlFor="contact-email">{t('email')}</Label>
              <Input
                id="contact-email"
                type="email"
                value={emailValue}
                onChange={onEmailChange}
                disabled={anonymous}
                aria-invalid={Boolean(emailError)}
              />
              <p className="contact-form__hint">{t('emailHint')}</p>
              <AnimatedError message={emailError} />
            </div>
          </motion.div>

          {/* A field people never see: only a bot fills it in, and then the message is quietly dropped. */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={onWebsiteChange}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="contact-form__trap"
          />

          <AnimatedError message={failure} />

          <Button type="submit" disabled={pending} className="contact-form__send">
            {pending ? t('sending') : t('send')}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
};
