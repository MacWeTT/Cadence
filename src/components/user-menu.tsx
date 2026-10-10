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

export async function UserMenu() {
  const user = await getUser();
  if (!user) return null;
  const name: string = user.user_metadata.full_name ?? user.email ?? 'Account';
  const avatarUrl: string | undefined = user.user_metadata.avatar_url;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-clay text-sm font-semibold text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small external Google avatar; next/image needs host config
            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-ink-muted">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
