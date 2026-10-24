'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AlertNotifier } from '@/components/alert-notifier/alert-notifier';
import { SyncPrompt } from '@/components/sync-prompt/sync-prompt';
import { TrayBridge } from '@/components/tray-bridge/tray-bridge';
import { UpdateNotifier } from '@/components/update-notifier/update-notifier';
import { UserMenuAvatar } from '@/components/user-menu-avatar/user-menu-avatar';
import { useSession } from '@/lib/query/use-session';
import './user-menu.css';
import { Tip } from '@/components/tip/tip';

/**
 * The top bar's avatar for the desktop build, which has no server to read the session on. It is there signed in or not (a
 * blank one until the profile has a picture), and opens the profile, where signing in is. When signed in, the sync runs.
 * It also carries the app's notifier, tray and updater, which need no account. It takes the place of `user-menu.tsx` there.
 */
export const UserMenu = () => {
  const t = useTranslations('common.account');

  const { data: user } = useSession();

  return (
    <>
      <AlertNotifier />
      <TrayBridge />
      <UpdateNotifier />
      {user !== undefined && (
        <Tip label={t('profile')}>
          <Link href="/profile" aria-label={t('profile')} className="user-menu__trigger">
            <UserMenuAvatar name={user?.email || t('fallbackName')} />
          </Link>
        </Tip>
      )}
      {user && <SyncPrompt />}
    </>
  );
};
