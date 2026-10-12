import { Suspense } from 'react';
import { FocusBar } from '@/components/focus-bar/focus-bar';
import { FocusHost } from '@/components/focus-host/focus-host';
import { Footer } from '@/components/footer/footer';
import { QueryProvider } from '@/components/query-provider/query-provider';
import { TabBar } from '@/components/tab-bar/tab-bar';
import { TopBar } from '@/components/top-bar/top-bar';
import { UserMenu } from '@/components/user-menu/user-menu';
import { AccentSync } from '@/app/(app)/accent-sync/accent-sync';
import { TimezoneSync } from '@/app/(app)/timezone-sync/timezone-sync';
import './layout.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = (props: AppLayoutProps) => {
  const { children } = props;

  return (
    <QueryProvider>
      <FocusHost>
        <div className="app-layout">
          {/* The session read streams in behind the boundary so the rest of the page isn't blocked. */}
          <TopBar
            menu={
              <Suspense fallback={<span className="app-layout__avatar-fallback" />}>
                <UserMenu />
              </Suspense>
            }
          />
          <FocusBar />
          <TimezoneSync />
          <AccentSync />
          <main className="app-layout__main">{children}</main>
          <Footer />
          <TabBar />
        </div>
      </FocusHost>
    </QueryProvider>
  );
};

export default AppLayout;
