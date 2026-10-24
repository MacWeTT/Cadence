import { Suspense } from 'react';
import { CirclesShell } from '@/app/(app)/circles/circles-shell/circles-shell';

interface CirclesLayoutProps {
  children: React.ReactNode;
}

/** Every Circles page sits in the same frame: your circles on the left, and the open one beside them. */
const CirclesLayout = (props: CirclesLayoutProps) => {
  const { children } = props;

  return (
    <Suspense>
      <CirclesShell>{children}</CirclesShell>
    </Suspense>
  );
};

export default CirclesLayout;
