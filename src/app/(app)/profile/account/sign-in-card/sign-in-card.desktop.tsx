'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AccountCard } from '@/app/(app)/profile/account/account-card/account-card';
import { Button } from '@/components/ui/button';
import { dataSource } from '@/data';
import { queryKeys } from '@/lib/query/keys';
import { useSession } from '@/lib/query/use-session';
import './sign-in-card.css';

/**
 * The desktop build's sign-in card: who is signed in, with Sign out, or a way to sign in. A password is set on the web
 * app's account page, so there is no password row here.
 */
export const SignInCard = () => {
  const t = useTranslations('account.signIn');

  const queryClient = useQueryClient();
  const { data: user } = useSession();

  const onSignOut = async () => {
    await dataSource.signOut();
    await queryClient.invalidateQueries({ queryKey: queryKeys.session });
  };

  if (user === undefined) {
    return null;
  }

  return (
    <AccountCard title={t('title')} intro={user ? t('deviceSignedInAs', { email: user.email }) : t('deviceSignedOut')}>
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
    </AccountCard>
  );
};
