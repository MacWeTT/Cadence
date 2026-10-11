import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InstallMenuItem } from '@/components/install-menu-item/install-menu-item';
import { getUser } from '@/lib/supabase/server';
import './user-menu.css';

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={t('menu')} className="user-menu__trigger">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small external Google avatar; next/image needs host config
            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="user-menu__avatar" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="user-menu__content">
        <DropdownMenuLabel className="user-menu__name">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/appearance" className="user-menu__link">
            {t('appearance')}
          </Link>
        </DropdownMenuItem>
        <InstallMenuItem />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="user-menu__sign-out">
              {t('signOut')}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
