'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { dataSource } from '@/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUpInputSchema } from '@/lib/auth-schema';
import { TAG_MAX, tagFromEmail } from '@/lib/tag';

interface SignUpFormProps {
  /** Where to go once the account is made. */
  next: string | null;
}

interface FormState {
  email: string;
  tag: string;
  /** Once the person has typed in the tag, it stops following the email. */
  tagTouched: boolean;
  password: string;
  confirm: string;
  error: string | null;
  busy: boolean;
}

/** Create an account with an email, a tag and a password. The tag starts from the email until it is edited. */
export const SignUpForm = (props: SignUpFormProps) => {
  const { next } = props;

  const [form, setForm] = useState<FormState>({
    email: '',
    tag: '',
    tagTouched: false,
    password: '',
    confirm: '',
    error: null,
    busy: false,
  });

  const t = useTranslations('auth.form');

  const { email, tag, tagTouched, password, confirm, error, busy } = form;
  const valid = signUpInputSchema.safeParse({ email, tag, password, confirm }).success;

  const onEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setForm({ ...form, email: value, tag: tagTouched ? tag : tagFromEmail(value), error: null });
  };

  const onTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, tag: event.target.value, tagTouched: true, error: null });
  };

  const onPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, password: event.target.value, error: null });
  };

  const onConfirmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, confirm: event.target.value, error: null });
  };

  const onSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForm({ ...form, busy: true, error: null });

    const { next: goTo, error: refusal } = await dataSource.signUp({ email, tag, password, confirm }, next);

    if (goTo) {
      // a full load, so nothing from before signing in is left in the page
      window.location.assign(goTo);

      return;
    }

    setForm({ ...form, busy: false, error: refusal });
  };

  return (
    <form onSubmit={onSubmit} className="auth-form__form">
      <div className="auth-form__field">
        <Label htmlFor="sign-up-email">{t('email')}</Label>
        <Input
          id="sign-up-email"
          type="email"
          value={email}
          autoComplete="email"
          spellCheck={false}
          autoCapitalize="none"
          onChange={onEmailChange}
        />
      </div>
      <div className="auth-form__field">
        <Label htmlFor="sign-up-tag">{t('tag')}</Label>
        <div className="auth-form__tag">
          <span aria-hidden className="auth-form__at">
            {t('tagAt')}
          </span>
          <Input
            id="sign-up-tag"
            value={tag}
            maxLength={TAG_MAX + 1}
            autoComplete="username"
            spellCheck={false}
            autoCapitalize="none"
            onChange={onTagChange}
            className="auth-form__tag-input"
          />
        </div>
        <p className="auth-form__hint">{t('tagHint')}</p>
      </div>
      <div className="auth-form__field">
        <Label htmlFor="sign-up-password">{t('password')}</Label>
        <Input
          id="sign-up-password"
          type="password"
          value={password}
          autoComplete="new-password"
          onChange={onPasswordChange}
        />
        <p className="auth-form__hint">{t('passwordHint')}</p>
      </div>
      <div className="auth-form__field">
        <Label htmlFor="sign-up-confirm">{t('confirm')}</Label>
        <Input
          id="sign-up-confirm"
          type="password"
          value={confirm}
          autoComplete="new-password"
          onChange={onConfirmChange}
        />
      </div>
      {error && (
        <p role="alert" className="auth-form__error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!valid || busy} className="auth-form__submit">
        {busy ? t('creating') : t('signUpButton')}
      </Button>
    </form>
  );
};
