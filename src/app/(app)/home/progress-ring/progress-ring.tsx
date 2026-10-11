'use client';

import { animate, motion, useMotionTemplate, useMotionValue } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import './progress-ring.css';

interface ProgressRingProps {
  done: number;
  total: number;
}

// Where the ring was when it was last on screen, so coming back to Home does not refill it from empty.
let lastAngle = 0;

/** A ring that fills as the day's habits get done, with "done/total" in the middle. The fill glides to each new share. */
export const ProgressRing = (props: ProgressRingProps) => {
  const { done, total } = props;

  const t = useTranslations('home');
  const reduceMotion = useReducedMotion();
  const angle = useMotionValue(lastAngle);

  const target = total ? (done / total) * 360 : 0;
  const background = useMotionTemplate`conic-gradient(var(--primary) ${angle}deg, var(--line) 0)`;

  useEffect(() => {
    if (reduceMotion) {
      angle.set(target);
      lastAngle = target;

      return;
    }

    const controls = animate(angle, target, { duration: 0.8, ease: [0.22, 1, 0.36, 1] });

    return () => {
      controls.stop();
      lastAngle = angle.get();
    };
  }, [angle, target, reduceMotion]);

  return (
    <motion.div
      role="img"
      aria-label={t('ringLabel', { done, total })}
      className="progress-ring"
      style={{ background }}
    >
      <span aria-hidden className="progress-ring__label">
        {done}
        {'/'}
        {total}
      </span>
    </motion.div>
  );
};
