'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import './nav-link.css';

interface NavLinkProps {
  href: string;
  /** Links of one group share one highlight: it glides from the link you left to the one you are on. */
  group: string;
  className?: string;
  children: React.ReactNode;
}

/** A link in the top bar or the footer. A soft, springy blob sits behind the one for the page you are on. */
export const NavLink = (props: NavLinkProps) => {
  const { href, group, className, children } = props;

  const active = usePathname() === href;

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn('nav-link', className, active && 'nav-link--active')}
    >
      {active && (
        <motion.span
          layoutId={group}
          aria-hidden
          className="nav-link__blob"
          // The radius is set here so the layout animation keeps the ends round while the blob stretches.
          style={{ borderRadius: 9999 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22, mass: 0.9 }}
        />
      )}
      <span className="nav-link__label">{children}</span>
    </Link>
  );
};
