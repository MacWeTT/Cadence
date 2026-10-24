'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { dataSource } from '@/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/password-input/password-input';
import { Label } from '@/components/ui/label';
import { signInInputSchema } from '@/lib/auth-schema';
import { cn } from '@/lib/utils';

interface SignInFormProps {
  /** Where to go once signed in. */
  next: string | null;
}

type Mode = 'tag' | 'email';

interface FormState {
  mode: Mode;
  identifier: string;
  password: string;
  error: string | null;
  busy: boolean;
}

const MODES: Mode[] = ['tag', 'email'];

/** Sign in with a tag or an email, and a password. There is no "forgot password": the note says what to do instead. */
export const SignInForm = (props: SignInFormProps) => {
  const { next } = props;

  const [form, setForm] = useState<FormState>({ mode: 'tag', identifier: '', password: '', error: null, busy: false });

  const t = useTranslations('auth.form');

  const { mode, identifier, password, error, busy } = form;
  const valid = signInInputSchema.safeParse({ mode, identifier, password }).success;

  const onModeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setForm({ ...form, mode: event.currentTarget.value as Mode, identifier: '', error: null });
  };

  const onIdentifierChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, identifier: event.target.value, error: null });
  };

  const onPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, password: event.target.value, error: null });
  };

  const onSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForm({ ...form, busy: true, error: null });

    const { next: goTo, error: refusal } = await dataSource.signIn({ mode, identifier, password }, next);

    if (goTo) {
      // a full load, so nothing from before signing in is left in the page
      window.location.assign(goTo);

      return;
    }

    setForm({ ...form, busy: false, error: refusal });
  };

  return (
    <form onSubmit={onSubmit} className="auth-form__form">
      <div role="tablist" aria-label={t('signInBy')} className="auth-form__subtabs">
        {MODES.map(name => {
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={mode === name}
              value={name}
              onClick={onModeClick}
              className={cn('auth-form__subtab', mode === name && 'auth-form__subtab--on')}
            >
              {t(name === 'tag' ? 'byTag' : 'byEmail')}
            </button>
          );
        })}
      </div>
      <div className="auth-form__field">
        <Label htmlFor="sign-in-identifier">{t(mode === 'tag' ? 'tag' : 'email')}</Label>
        <div className="auth-form__tag">
          {mode === 'tag' && (
            <span aria-hidden className="auth-form__at">
              {t('tagAt')}
            </span>
          )}
          <Input
            id="sign-in-identifier"
            type={mode === 'tag' ? 'text' : 'email'}
            value={identifier}
            autoComplete={mode === 'tag' ? 'username' : 'email'}
            spellCheck={false}
            autoCapitalize="none"
            onChange={onIdentifierChange}
            className={cn(mode === 'tag' && 'auth-form__tag-input')}
          />
        </div>
      </div>
      <div className="auth-form__field">
        <Label htmlFor="sign-in-password">{t('password')}</Label>
        <PasswordInput
          id="sign-in-password"
          value={password}
          autoComplete="current-password"
          onChange={onPasswordChange}
        />
        <p className="auth-form__hint">{t('noReset')}</p>
      </div>
      {error && (
        <p role="alert" className="auth-form__error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!valid || busy} className="auth-form__submit">
        {busy ? t('signingIn') : t('signInButton')}
      </Button>
    </form>
  );
};
