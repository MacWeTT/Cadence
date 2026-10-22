'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useProfile } from '@/app/(app)/profile/use-profile';
import './profile-warnings.css';

/** What is missing on this account. It is only ever shown on the profile page, and nowhere else in the app. */
export const ProfileWarnings = () => {
  const t = useTranslations('profile.warnings');
  const { data } = useProfile();

  if (!data || data.passwordSet) {
    return null;
  }

  return (
    <div role="status" className="profile-warnings">
      <p>{t('noPassword')}</p>
      <Link href="/profile/account" className="profile-warnings__link">
        {t('setPassword')}
      </Link>
    </div>
  );
};
