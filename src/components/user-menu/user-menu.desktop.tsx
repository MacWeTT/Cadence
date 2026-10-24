'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AlertNotifier } from '@/components/alert-notifier/alert-notifier';
import { SyncPrompt } from '@/components/sync-prompt/sync-prompt';
import { UpdateNotifier } from '@/components/update-notifier/update-notifier';
import { UserMenuAvatar } from '@/components/user-menu-avatar/user-menu-avatar';
import { useSession } from '@/lib/query/use-session';
import './user-menu.css';

/**
 * The top bar's avatar for the desktop build, which has no server to read the session on. Signed in, it is the same
 * avatar and the sync runs; without an account, a link to sign in. It also carries the app's notifier, which needs
 * neither. It takes the place of `user-menu.tsx` there.
 */
export const UserMenu = () => {
  const t = useTranslations('common.account');

  const { data: user } = useSession();

  return (
    <>
      <AlertNotifier />
      <UpdateNotifier />
      {user === null && (
        <Link href="/login" className="user-menu__sign-in">
          {t('signIn')}
        </Link>
      )}
      {user && (
        <>
          <Link href="/profile" aria-label={t('profile')} className="user-menu__trigger">
            <UserMenuAvatar name={user.email || t('fallbackName')} />
          </Link>
          <SyncPrompt />
        </>
      )}
    </>
  );
};
