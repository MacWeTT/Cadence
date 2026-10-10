import { signOut } from '@/app/auth/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getUser } from '@/lib/supabase/server';
import './user-menu.css';

export const UserMenu = async () => {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const name: string = user.user_metadata.full_name ?? user.email ?? 'Account';
  const avatarUrl: string | undefined = user.user_metadata.avatar_url;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Account menu" className="user-menu__trigger">
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
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="user-menu__sign-out">
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
