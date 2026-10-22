'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SignInForm } from '@/components/sign-in-form/sign-in-form';
import { SignUpForm } from '@/components/sign-up-form/sign-up-form';
import { cn } from '@/lib/utils';
import './auth-form.css';

type Tab = 'signIn' | 'signUp';

const TABS: Tab[] = ['signIn', 'signUp'];

/**
 * The login page's form: two tabs, Sign in (by tag or by email) and Create account. Where the person was going comes
 * from `?next=`, which the actions check again. The classes of both forms are in this folder's CSS.
 */
export const AuthForm = () => {
  const [tab, setTab] = useState<Tab>('signIn');

  const t = useTranslations('auth.form');
  const params = useSearchParams();

  const next = params.get('next');

  const onTabClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setTab(event.currentTarget.value as Tab);
  };

  return (
    <div className="auth-form">
      <div role="tablist" className="auth-form__tabs">
        {TABS.map(name => {
          return (
            <button
              key={name}
              type="button"
              role="tab"
              id={`auth-tab-${name}`}
              aria-selected={tab === name}
              aria-controls="auth-panel"
              value={name}
              onClick={onTabClick}
              className={cn('auth-form__tab', tab === name && 'auth-form__tab--on')}
            >
              {t(`${name}Tab`)}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id="auth-panel" aria-labelledby={`auth-tab-${tab}`}>
        {tab === 'signIn' ? <SignInForm next={next} /> : <SignUpForm next={next} />}
      </div>
    </div>
  );
};
