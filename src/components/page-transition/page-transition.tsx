import { Suspense, ViewTransition } from 'react';

interface PageTransitionProps {
  /** The loading skeleton. Leave it out for a page with nothing to wait for. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The motion of a page: the old page fades out; while data loads, the skeleton fades in after it and fades away as the
 * real content arrives, which slides up whole, title and all. The animations are in globals.css (the browser's
 * View Transitions).
 */
export const PageTransition = (props: PageTransitionProps) => {
  const { fallback, children } = props;

  if (!fallback) {
    return (
      <ViewTransition enter="slide-up" exit="page-out" default="none">
        {children}
      </ViewTransition>
    );
  }

  return (
    <ViewTransition exit="page-out" default="none">
      <Suspense
        fallback={
          <ViewTransition enter="fade-in" exit="slide-down" default="none">
            {fallback}
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          {children}
        </ViewTransition>
      </Suspense>
    </ViewTransition>
  );
};
