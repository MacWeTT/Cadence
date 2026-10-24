import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { UserMenuAvatar } from '@/components/user-menu-avatar/user-menu-avatar';
import { getUser } from '@/lib/supabase/server';
import './user-menu.css';
import { Tip } from '@/components/tip/tip';

/** The person's avatar in the top bar. It opens their profile, where sign out and the rest of the settings are. */
export const UserMenu = async () => {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const t = await getTranslations('common.account');

  const {
    user_metadata: { full_name: fullName, avatar_url },
    email,
  } = user;
  const name: string = fullName ?? email ?? t('fallbackName');
  const avatarUrl: string | undefined = avatar_url;

  return (
    <Tip label={t('profile')}>
      <Link href="/profile" aria-label={t('profile')} className="user-menu__trigger">
        <UserMenuAvatar name={name} googleUrl={avatarUrl} />
      </Link>
    </Tip>
  );
};
