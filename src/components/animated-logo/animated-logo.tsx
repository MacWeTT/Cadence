'use client';

import { stagger, useAnimate, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Logo } from '../logo/logo';
import { WORDMARK } from '../logo/logo-shapes';
import './animated-logo.css';

const EASE = [0.65, 0, 0.35, 1] as const;

interface AnimatedLogoProps {
  /** Called once the C has become "Cadence." (straight away when the person asked for less motion). */
  onComplete?: () => void;
}

/**
 * The ring "C" draws itself and its dot pops in. Then the ring glides left, the letters flow out of it, the ring turns
 * into the serif C and the dot slides to the end to become the full stop. With "reduce motion" it shows the finished logo.
 */
export const AnimatedLogo = (props: AnimatedLogoProps) => {
  const { onComplete } = props;

  const [scope, animate] = useAnimate<SVGSVGElement>();

  const t = useTranslations('common');
  const reduceMotion = useReducedMotion();

  const { viewBox, letters, stop, ring, ringCenter } = WORDMARK;
  const width = Number(viewBox.split(' ')[2]);
  const startX = width / 2 - ringCenter.cx; // the ring starts in the middle, then the word grows out of it

  useEffect(() => {
    if (reduceMotion) {
      onComplete?.();

      return;
    }

    let cancelled = false;

    const play = async () => {
      await animate(
        '.animated-logo__ring',
        { pathLength: [0, 1], opacity: [0, 1] },
        { duration: 0.75, ease: 'easeOut' },
      );
      await animate('.animated-logo__dot', { scale: [0, 1.3, 1], opacity: 1 }, { duration: 0.4 });
      await new Promise(resolve => {
        return setTimeout(resolve, 250);
      });

      if (cancelled) {
        return;
      }

      await Promise.all([
        animate('.animated-logo__stage', { x: [startX, 0] }, { duration: 0.95, ease: EASE }),
        animate(
          '.animated-logo__letter',
          { opacity: [0, 1], x: [-16, 0] },
          { duration: 0.5, delay: stagger(0.07, { startDelay: 0.3 }) },
        ),
        animate('.animated-logo__ring', { opacity: [1, 0] }, { duration: 0.45, delay: 0.3 }),
        animate('.animated-logo__c', { opacity: [0, 1] }, { duration: 0.45, delay: 0.3 }),
        animate(
          '.animated-logo__dot',
          { x: stop.cx - ring.dot.cx, y: stop.cy - ring.dot.cy, scale: stop.r / ring.dot.r },
          { duration: 0.95, ease: EASE },
        ),
      ]);

      if (!cancelled) {
        onComplete?.();
      }
    };

    void play();

    return () => {
      cancelled = true;
      scope.animations.forEach(controls => {
        return controls.stop();
      });
    };
  }, [reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps -- plays once; `onComplete` is read when it finishes

  if (reduceMotion) {
    return <Logo />;
  }

  return (
    <svg ref={scope} role="img" aria-label={t('brand')} viewBox={viewBox} className="animated-logo">
      <g className="animated-logo__stage">
        <path d={ring.ring} strokeWidth={ring.strokeWidth} className="animated-logo__ring" />
        {letters.map(({ char, d }, i) => {
          return <path key={`${char}-${i}`} d={d} className={i === 0 ? 'animated-logo__c' : 'animated-logo__letter'} />;
        })}
        <circle cx={ring.dot.cx} cy={ring.dot.cy} r={ring.dot.r} className="animated-logo__dot" />
      </g>
    </svg>
  );
};
