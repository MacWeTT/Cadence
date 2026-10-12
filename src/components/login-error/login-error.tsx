'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import './login-error.css';

/** What the login page says about how you got here: a failed sign-in, or an account you just deleted. */
export const LoginError = () => {
  const t = useTranslations('auth');

  const params = useSearchParams();

  if (params.get('deleted') === '1') {
    return (
      <p role="status" className="login-error login-error--note">
        {t('accountDeleted')}
      </p>
    );
  }

  if (params.get('error') !== 'auth') {
    return null;
  }

  return (
    <p role="alert" className="login-error">
      {t('signInFailed')}
    </p>
  );
};
