'use client';

import { useTranslations } from 'next-intl';
import { Logo } from '@/components/logo/logo';
import { NavLink } from '@/components/nav-link/nav-link';
import { TOP_LINKS } from '@/components/nav-links/nav-links';
import { ThemeToggle } from '@/components/theme-toggle/theme-toggle';
import './top-bar.css';

interface TopBarProps {
  menu?: React.ReactNode;
}

export const TopBar = (props: TopBarProps) => {
  const { menu } = props;

  const t = useTranslations('common');

  return (
    <header className="top-bar">
      <div className="top-bar__inner">
        <NavLink href="/" group="top-nav" className="top-bar__logo">
          <Logo />
        </NavLink>
        <nav className="top-bar__nav">
          {TOP_LINKS.map(({ href, name }) => {
            return (
              <NavLink key={href} href={href} group="top-nav">
                {t(`nav.${name}`)}
              </NavLink>
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
