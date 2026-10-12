'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './profile-tabs.css';

const TABS = [
  { href: '/profile', key: 'overview' },
  { href: '/profile/appearance', key: 'appearance' },
  { href: '/profile/notifications', key: 'notifications' },
  { href: '/profile/account', key: 'account' },
] as const;

/** The profile's sections. Each is its own page, so a tab can be linked to and the back button works. */
export const ProfileTabs = () => {
  const t = useTranslations('profile.tabs');

  const pathname = usePathname();

  return (
    <nav aria-label={t('label')} className="profile-tabs">
      {TABS.map(({ href, key }) => {
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={clsx('profile-tabs__tab', active && 'profile-tabs__tab--active')}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
};
