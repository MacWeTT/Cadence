'use client';

import { useTranslations } from 'next-intl';
import { NavLink } from '@/components/nav-link/nav-link';
import { TAB_LINKS } from '@/components/nav-links/nav-links';
import './tab-bar.css';

/** The main pages as a bar at the foot of the screen, within thumb's reach, on phones. Larger screens use the top bar. */
export const TabBar = () => {
  const t = useTranslations('common');

  return (
    <nav aria-label={t('nav.label')} className="tab-bar">
      {TAB_LINKS.map(({ href, name, Icon }) => {
        return (
          <NavLink key={href} href={href} group="tab-nav" className="tab-bar__link">
            <Icon aria-hidden className="tab-bar__icon" />
            {t(`nav.${name}`)}
          </NavLink>
        );
      })}
    </nav>
  );
};
