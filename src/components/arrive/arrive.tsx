'use client';

import { motion } from 'motion/react';

interface ArriveProps {
  children: React.ReactNode;
  /** Its place in the page: later blocks come in a little after earlier ones. */
  index: number;
}

/** A block of a page that fades in and lifts into place, a moment after the block before it. */
export const Arrive = (props: ArriveProps) => {
  const { children, index } = props;

  return (
    <motion.div
      className="arrive"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 + index * 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};
