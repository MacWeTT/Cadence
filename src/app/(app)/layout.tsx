import { Suspense } from 'react';
import { Footer } from '@/components/footer/footer';
import { TopBar } from '@/components/top-bar/top-bar';
import { UserMenu } from '@/components/user-menu/user-menu';
import { TimezoneSync } from './timezone-sync/timezone-sync';
import './layout.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = (props: AppLayoutProps) => {
  const { children } = props;

  return (
    <div className="app-layout">
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
      <Footer />
    </div>
  );
};

export default AppLayout;
