'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { registerAction } from '@/app/(auth)/register/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerInputSchema } from '@/lib/auth-schema';
import { TAG_MAX } from '@/lib/tag';
import './register-form.css';

interface RegisterFormProps {
  email: string;
  /** The tag the account has now: the default made from the email or the GitHub name. */
  tag: string;
  /** Where to go once saved. */
  next: string | null;
}

interface FormState {
  tag: string;
  password: string;
  confirm: string;
  error: string | null;
  saving: boolean;
}

/** The form after a first Google sign-in: the email (locked), the tag to keep, and a password typed twice. */
export const RegisterForm = (props: RegisterFormProps) => {
  const { email, tag, next } = props;

  const [form, setForm] = useState<FormState>({ tag, password: '', confirm: '', error: null, saving: false });

  const t = useTranslations('auth.register');
  const router = useRouter();

  const { tag: draftTag, password, confirm, error, saving } = form;
  const valid = registerInputSchema.safeParse({ tag: draftTag, password, confirm }).success;

  const onTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, tag: event.target.value, error: null });
  };

  const onPasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, password: event.target.value, error: null });
  };

  const onConfirmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, confirm: event.target.value, error: null });
  };

  const onSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForm({ ...form, saving: true, error: null });

    const { next: goTo, error: refusal } = await registerAction({ tag: draftTag, password, confirm }, next);

    if (goTo) {
      router.replace(goTo);

      return;
    }

    setForm({ ...form, saving: false, error: refusal });
  };

  return (
    <form onSubmit={onSubmit} className="register-form">
      <div className="register-form__field">
        <Label htmlFor="register-email">{t('email')}</Label>
        <Input id="register-email" type="email" value={email} readOnly disabled />
        <p className="register-form__hint">{t('emailHint')}</p>
      </div>
      <div className="register-form__field">
        <Label htmlFor="register-tag">{t('tag')}</Label>
        <div className="register-form__tag">
          <span aria-hidden className="register-form__at">
            {t('tagAt')}
          </span>
          <Input
            id="register-tag"
            value={draftTag}
            maxLength={TAG_MAX + 1}
            autoComplete="username"
            spellCheck={false}
            onChange={onTagChange}
            className="register-form__tag-input"
          />
        </div>
        <p className="register-form__hint">{t('tagHint')}</p>
      </div>
      <div className="register-form__field">
        <Label htmlFor="register-password">{t('password')}</Label>
        <Input
          id="register-password"
          type="password"
          value={password}
          autoComplete="new-password"
          onChange={onPasswordChange}
        />
        <p className="register-form__hint">{t('passwordHint')}</p>
      </div>
      <div className="register-form__field">
        <Label htmlFor="register-confirm">{t('confirm')}</Label>
        <Input
          id="register-confirm"
          type="password"
          value={confirm}
          autoComplete="new-password"
          onChange={onConfirmChange}
        />
      </div>
      {error && (
        <p role="alert" className="register-form__error">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!valid || saving} className="register-form__save">
        {saving ? t('saving') : t('save')}
      </Button>
    </form>
  );
};
