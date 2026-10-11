'use client';

import { AnimatePresence, motion } from 'motion/react';
import './animated-error.css';

interface AnimatedErrorProps {
  /** The message, or nothing: it eases in when it appears and folds away when it goes. */
  message: string | null | undefined;
  id?: string;
}

/** A line of error text under a field that does not make the form jump when it comes and goes. */
export const AnimatedError = (props: AnimatedErrorProps) => {
  const { message, id } = props;

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          key={message}
          id={id}
          role="alert"
          className="animated-error"
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
};
