'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '../logo/logo';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import './top-bar.css';

const links = [
  { href: '/today', name: 'today' },
  { href: '/habits', name: 'habits' },
  { href: '/progress', name: 'progress' },
] as const;

interface TopBarProps {
  menu?: React.ReactNode;
}

export const TopBar = (props: TopBarProps) => {
  const { menu } = props;

  const pathname = usePathname();
  const t = useTranslations('common');

  return (
    <header className="top-bar">
      <div className="top-bar__inner">
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={cn('top-bar__logo', pathname === '/' && 'top-bar__logo--current')}
        >
          <Logo />
        </Link>
        <nav className="top-bar__nav">
          {links.map(({ href, name }) => {
            const active = pathname === href;

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn('top-bar__link', active && 'top-bar__link--active')}
              >
                {t(`nav.${name}`)}
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
