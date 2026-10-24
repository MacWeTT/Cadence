'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AccountCard } from '@/app/(app)/profile/account/account-card/account-card';
import { PasswordModal } from '@/app/(app)/profile/account/password-modal/password-modal';
import { useProfile } from '@/app/(app)/profile/use-profile';
import { Button } from '@/components/ui/button';
import './sign-in-card.css';
import { WhyDisabled } from '@/components/why-disabled/why-disabled';

/** How you get into the account: the password, to set or change. */
export const SignInCard = () => {
  const [open, setOpen] = useState(false);

  const t = useTranslations('account.signIn');
  const tw = useTranslations('common.why');
  const { data } = useProfile();

  const passwordSet = data?.passwordSet ?? false;

  const onOpen = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <AccountCard title={t('title')} intro={t('intro')}>
      <div className="sign-in-card__row">
        <div>
          <p className="sign-in-card__label">{t('password')}</p>
          <p className="sign-in-card__status">{passwordSet ? t('isSet') : t('notSet')}</p>
        </div>
        <WhyDisabled reason={!data ? tw('loading') : null}>
          <Button variant="outline" onClick={onOpen} disabled={!data}>
            {passwordSet ? t('changeButton') : t('setButton')}
          </Button>
        </WhyDisabled>
      </div>
      {open && <PasswordModal hasPassword={passwordSet} onClose={onClose} />}
    </AccountCard>
  );
};
