'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { UserMenuAvatar } from '@/components/user-menu-avatar/user-menu-avatar';
import { useSession } from '@/lib/query/use-session';
import './user-menu.css';

/**
 * The top bar's avatar for the desktop build, which has no server to read the session on. Signed in, it is the same
 * avatar; without an account, a link to sign in. It takes the place of `user-menu.tsx` there.
 */
export const UserMenu = () => {
  const t = useTranslations('common.account');

  const { data: user } = useSession();

  if (user === undefined) {
    return null;
  }

  if (user === null) {
    return (
      <Link href="/login" className="user-menu__sign-in">
        {t('signIn')}
      </Link>
    );
  }

  return (
    <Link href="/profile" aria-label={t('profile')} className="user-menu__trigger">
      <UserMenuAvatar name={user.email || t('fallbackName')} />
    </Link>
  );
};
