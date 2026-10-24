'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { AccountCard } from '@/app/(app)/profile/account/account-card/account-card';
import { PasswordModal } from '@/app/(app)/profile/account/password-modal/password-modal';
import { useProfile } from '@/app/(app)/profile/use-profile';
import { Button } from '@/components/ui/button';
import { dataSource } from '@/data';
import { queryKeys } from '@/lib/query/keys';
import { useSession } from '@/lib/query/use-session';
import './sign-in-card.css';

/**
 * The desktop build's sign-in card: who is signed in, with the password and Sign out, or a way to sign in. The password
 * belongs to the account, so it can only be set or changed while signed in.
 */
export const SignInCard = () => {
  const [open, setOpen] = useState(false);

  const t = useTranslations('account.signIn');

  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const { data: profile } = useProfile();

  const passwordSet = profile?.passwordSet ?? false;

  const onSignOut = async () => {
    await dataSource.signOut();
    await queryClient.invalidateQueries({ queryKey: queryKeys.session });
  };

  const onOpen = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  if (user === undefined) {
    return null;
  }

  return (
    <AccountCard title={t('title')} intro={user ? t('deviceSignedInAs', { email: user.email }) : t('deviceSignedOut')}>
      {user && (
        <div className="sign-in-card__row">
          <div>
            <p className="sign-in-card__label">{t('password')}</p>
            <p className="sign-in-card__status">{passwordSet ? t('isSet') : t('notSet')}</p>
          </div>
          <Button variant="outline" onClick={onOpen} disabled={!profile}>
            {passwordSet ? t('changeButton') : t('setButton')}
          </Button>
        </div>
      )}
      <div className="sign-in-card__row">
        {user ? (
          <Button variant="outline" onClick={onSignOut}>
            {t('deviceSignOut')}
          </Button>
        ) : (
          <Button asChild>
            <Link href="/login">{t('deviceSignIn')}</Link>
          </Button>
        )}
      </div>
      {open && <PasswordModal hasPassword={passwordSet} onClose={onClose} />}
    </AccountCard>
  );
};
