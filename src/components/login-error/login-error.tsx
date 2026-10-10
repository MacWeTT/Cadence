'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import './login-error.css';

export const LoginError = () => {
  const t = useTranslations('auth');

  if (useSearchParams().get('error') !== 'auth') {
    return null;
  }

  return (
    <p role="alert" className="login-error">
      {t('signInFailed')}
    </p>
  );
};
