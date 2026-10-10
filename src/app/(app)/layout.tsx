import { Suspense } from 'react';
import { TopBar } from '@/components/top-bar';
import { UserMenu } from '@/components/user-menu';
import { TimezoneSync } from './timezone-sync';
import './layout.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = (props: AppLayoutProps) => {
  const { children } = props;

  return (
    <>
      {/* The session read streams in behind the boundary so the rest of the page isn't blocked. */}
      <TopBar
        menu={
          <Suspense fallback={<span className="app-layout__avatar-fallback" />}>
            <UserMenu />
          </Suspense>
        }
      />
      <TimezoneSync />
      <main className="app-layout__main">{children}</main>
    </>
  );
};

export default AppLayout;
