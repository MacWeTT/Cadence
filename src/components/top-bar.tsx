'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';

const links = [
  { href: '/today', label: 'Today' },
  { href: '/habits', label: 'Habits' },
  { href: '/progress', label: 'Progress' },
];

export function TopBar({ menu }: { menu?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-topbar">
      <div className="mx-auto flex h-16 w-full max-w-295 items-center gap-8 px-8">
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={`rounded-sm font-display text-xl focus-visible:outline-2 focus-visible:outline-clay ${
            pathname === '/' ? 'underline decoration-2 underline-offset-8' : ''
          }`}
        >
          Cadence
        </Link>
        <nav className="flex gap-6">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={active ? 'font-semibold text-ink' : 'text-ink-muted hover:text-ink'}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {menu}
        </div>
      </div>
    </header>
  );
}
