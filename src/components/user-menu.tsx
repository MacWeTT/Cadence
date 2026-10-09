import { signOut } from "@/app/auth/actions";
import { getUser } from "@/lib/supabase/server";

// shortcut: native <details> menu, so it doesn't close on outside click; swap for a popover when we adopt shadcn.
export async function UserMenu() {
  const user = await getUser();
  if (!user) return null;
  const name: string = user.user_metadata.full_name ?? user.email ?? "Account";
  const avatarUrl: string | undefined = user.user_metadata.avatar_url;

  return (
    <details className="relative">
      <summary
        aria-label="Account menu"
        className="flex size-9 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full bg-clay text-sm font-semibold text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small external Google avatar; next/image needs host config
          <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-line bg-surface p-3 shadow-sm">
        <p className="truncate px-2 pb-2 text-sm text-muted">{name}</p>
        <form action={signOut}>
          <button type="submit" className="w-full rounded-md px-2 py-1.5 text-left hover:bg-line focus-visible:outline-2 focus-visible:outline-clay">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
