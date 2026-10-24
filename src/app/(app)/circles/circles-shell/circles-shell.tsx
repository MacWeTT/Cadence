'use client';

import { usePathname } from 'next/navigation';
import { CirclesRail } from '@/app/(app)/circles/circles-rail/circles-rail';
import { cn } from '@/lib/utils';
import './circles-shell.css';

interface CirclesShellProps {
  children: React.ReactNode;
}

/**
 * Like a messaging app: on a wide screen your circles are a list on the left and the open one is beside it. On a phone
 * they are two screens, the list and then the circle, so each gets the whole width. An invite link opens on its own.
 */
export const CirclesShell = (props: CirclesShellProps) => {
  const { children } = props;

  const pathname = usePathname();

  if (pathname.startsWith('/circles/join')) {
    return <>{children}</>;
  }

  return (
    <div className={cn('circles-shell', pathname === '/circles' && 'circles-shell--index')}>
      <aside className="circles-shell__rail">
        <CirclesRail />
      </aside>
      <div className="circles-shell__content">{children}</div>
    </div>
  );
};
