'use client';

import { motion, useReducedMotion } from 'motion/react';
import './about-illustration.css';

const BASE = 280; // where the bars stand
const WIDTH = 26;
const STEP = 37;
const FIRST_X = 40;
/** Seven days, each a little steadier than the last. */
const HEIGHTS = [60, 86, 78, 118, 134, 160, 196];
const SUN = { x: 279, y: 52 };
const TREND = 'M53 196Q110 130 170 120T279 60';
const TODAY = HEIGHTS.length - 1;
const FIRST_BAR = 0.4; // seconds before the first bar starts to grow
const BAR_GAP = 0.12;

const barTone = (day: number) => {
  if (day === TODAY) {
    return 'about-illustration__bar--today';
  }

  return day > 3 ? 'about-illustration__bar--steady' : 'about-illustration__bar--early';
};

/**
 * Seven bars grow one after another, each a little taller than the last, today's in clay. A dotted line traces the climb
 * to a sun: consistency, drawn. With "reduce motion" it is shown finished.
 */
export const AboutIllustration = () => {
  const reduceMotion = useReducedMotion();

  const barsDone = FIRST_BAR + HEIGHTS.length * BAR_GAP + 0.5;

  return (
    <svg aria-hidden viewBox="0 0 320 320" className="about-illustration">
      <circle cx={160} cy={165} r={120} className="about-illustration__halo" />
      <rect x={26} y={BASE - 2} width={268} height={6} rx={3} className="about-illustration__ground" />
      {HEIGHTS.map((height, day) => {
        return (
          <motion.rect
            key={day}
            x={FIRST_X + day * STEP}
            width={WIDTH}
            rx={WIDTH / 2}
            className={barTone(day)}
            initial={reduceMotion ? false : { height: 0, y: BASE }}
            animate={{ height, y: BASE - height }}
            transition={{ duration: 0.7, delay: FIRST_BAR + day * BAR_GAP, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}
      <clipPath id="about-trend-reveal">
        <motion.rect
          x={0}
          y={0}
          height={320}
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: 320 }}
          transition={{ duration: 1, delay: barsDone, ease: 'easeInOut' }}
        />
      </clipPath>
      <path d={TREND} clipPath="url(#about-trend-reveal)" className="about-illustration__trend" />
      <motion.circle
        cx={SUN.x}
        cy={SUN.y}
        r={14}
        className="about-illustration__sun"
        style={{ transformOrigin: `${SUN.x}px ${SUN.y}px` }}
        initial={reduceMotion ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 11, delay: barsDone + 0.9 }}
      />
    </svg>
  );
};
