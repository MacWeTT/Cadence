'use client';

import { MotionConfig } from 'motion/react';

interface MotionProviderProps {
  children: React.ReactNode;
}

/** Everything that moves follows the person's "reduce motion" setting: movement is dropped, fades stay. */
export const MotionProvider = (props: MotionProviderProps) => {
  const { children } = props;

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
};
