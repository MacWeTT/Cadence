'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import './character-limit.css';

const RADIUS = 10;
const CIRCLE = 2 * Math.PI * RADIUS;
/** The ring turns yellow with this many characters left, and shows the number with this many. */
const WARN_AT = 100;
const COUNT_AT = 20;

interface CharacterLimitProps {
  count: number;
  limit: number;
}

/**
 * A round counter like a tweet's: it fills as you type, turns yellow near the limit, shows the characters left in the
 * last few, and turns red with a note once the limit is reached.
 */
export const CharacterLimit = (props: CharacterLimitProps) => {
  const { count, limit } = props;

  const t = useTranslations('common.limit');

  const left = Math.max(0, limit - count);
  const full = left === 0;
  const state = full ? 'full' : left <= WARN_AT ? 'warn' : null;

  return (
    <div
      role="img"
      aria-label={t('left', { count: left })}
      className={cn(
        'character-limit',
        state && `character-limit--${state}`,
        left <= COUNT_AT && 'character-limit--close',
      )}
    >
      <AnimatePresence>
        {full && (
          <motion.div
            role="tooltip"
            className="character-limit__tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            {t('reached', { max: limit })}
          </motion.div>
        )}
      </AnimatePresence>
      <svg viewBox="0 0 24 24" aria-hidden className="character-limit__ring">
        <circle cx={12} cy={12} r={RADIUS} className="character-limit__track" />
        <motion.circle
          cx={12}
          cy={12}
          r={RADIUS}
          className="character-limit__bar"
          strokeDasharray={CIRCLE}
          initial={false}
          animate={{ strokeDashoffset: CIRCLE * (1 - Math.min(1, count / limit)) }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </svg>
      {left <= COUNT_AT && !full && <span className="character-limit__remaining">{left}</span>}
    </div>
  );
};
