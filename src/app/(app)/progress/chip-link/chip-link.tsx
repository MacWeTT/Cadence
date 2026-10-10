import Link from 'next/link';
import { cn } from '@/lib/utils';
import './chip-link.css';

interface ChipLinkProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

/** A pill-shaped link that marks the current choice with `aria-current`. */
export const ChipLink = (props: ChipLinkProps) => {
  const { href, active, children } = props;

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn('chip-link', active && 'chip-link--active')}
    >
      {children}
    </Link>
  );
};
