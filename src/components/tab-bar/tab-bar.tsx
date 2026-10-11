'use client';

import { CalendarCheck, ChartColumn, House, ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NavLink } from '@/components/nav-link/nav-link';
import './tab-bar.css';

const tabs = [
  { href: '/', name: 'home', Icon: House },
  { href: '/today', name: 'today', Icon: CalendarCheck },
  { href: '/habits', name: 'habits', Icon: ListChecks },
  { href: '/progress', name: 'progress', Icon: ChartColumn },
] as const;

/** The main pages as a bar at the foot of the screen, within thumb's reach, on phones. Larger screens use the top bar. */
export const TabBar = () => {
  const t = useTranslations('common');

  return (
    <nav aria-label={t('nav.label')} className="tab-bar">
      {tabs.map(({ href, name, Icon }) => {
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
