'use client';

import { useTranslations } from 'next-intl';
import { WhyDisabled } from '@/components/why-disabled/why-disabled';
import { cn } from '@/lib/utils';
import './nav-soon.css';

interface NavSoonProps {
  className?: string;
  children: React.ReactNode;
}

/** A place in the navigation that is not there yet: it looks like the other links, is switched off, and says when it comes. */
export const NavSoon = (props: NavSoonProps) => {
  const { className, children } = props;

  const t = useTranslations('common.nav');

  return (
    <WhyDisabled reason={t('soonInApp')}>
      <span role="link" aria-disabled="true" className={cn('nav-link', className, 'nav-soon')}>
        <span className="nav-link__label">{children}</span>
      </span>
    </WhyDisabled>
  );
};
