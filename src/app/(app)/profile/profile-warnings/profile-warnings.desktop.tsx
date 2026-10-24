'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useProfile } from '@/app/(app)/profile/use-profile';
import { useSession } from '@/lib/query/use-session';
import './profile-warnings.css';

/**
 * The desktop build's profile notice. Without an account there is no password to be missing, so it says the PC is on its
 * own and offers to sign in; signed in, it is the same notice as the website's, about a missing password.
 */
export const ProfileWarnings = () => {
  const t = useTranslations('profile.warnings');
  const ta = useTranslations('account.signIn');
  const { data } = useProfile();
  const { data: user } = useSession();

  if (!data || user === undefined) {
    return null;
  }

  if (user === null) {
    return (
      <div role="status" className="profile-warnings">
        <p>{ta('deviceSignedOut')}</p>
        <Link href="/login" className="profile-warnings__link">
          {ta('deviceSignIn')}
        </Link>
      </div>
    );
  }

  if (data.passwordSet) {
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
