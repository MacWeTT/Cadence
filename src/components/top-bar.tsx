'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import './top-bar.css';

const links = [
  { href: '/today', label: 'Today' },
  { href: '/habits', label: 'Habits' },
  { href: '/progress', label: 'Progress' },
];

interface TopBarProps {
  menu?: React.ReactNode;
}

export const TopBar = (props: TopBarProps) => {
  const { menu } = props;

  const pathname = usePathname();

  return (
    <header className="top-bar">
      <div className="top-bar__inner">
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={cn('top-bar__logo', pathname === '/' && 'top-bar__logo--current')}
        >
          Cadence
        </Link>
        <nav className="top-bar__nav">
          {links.map(({ href, label }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn('top-bar__link', active && 'top-bar__link--active')}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="top-bar__actions">
          <ThemeToggle />
          {menu}
        </div>
      </div>
    </header>
  );
};
