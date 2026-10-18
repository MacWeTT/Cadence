'use client';

import { useTranslations } from 'next-intl';
import { usePhaseLabel } from '@/components/focus-host/use-phase-label';
import { Button } from '@/components/ui/button';
import { formatClock, type SessionView } from '@/lib/focus-clock';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { cn } from '@/lib/utils';
import './focus-running.css';

interface FocusRunningProps {
  view: SessionView;
  mode: 'free' | 'pomodoro';
  pending: boolean;
  /** The habit that is already running, when the person tried to start another one. */
  conflict: string | null;
  onStop: () => void;
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
}

const RADIUS = 52;
const CIRCLE = 2 * Math.PI * RADIUS;

/** A ring and a large countdown (or count-up), the phase, the round dots, Pause or Resume, Stop, and Skip break during a break. */
export const FocusRunning = (props: FocusRunningProps) => {
  const { view, mode, pending, conflict, onStop, onSkip, onPause, onResume } = props;
  const { phase, round, rounds, clock, phaseLength, paused } = view;

  const t = useTranslations('focus.running');
  const reduced = useReducedMotion();

  const left = phaseLength > 0 ? clock / phaseLength : 1;
  const label = usePhaseLabel(view);
  const dots = Array.from({ length: mode === 'pomodoro' ? rounds : 0 }, (_, index) => {
    return index + 1;
  });

  return (
    <div className="focus-running">
      <div className="focus-running__ring">
        <svg viewBox="0 0 120 120" aria-hidden className="focus-running__svg">
          <circle cx="60" cy="60" r={RADIUS} className="focus-running__track" />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            className={cn('focus-running__arc', !reduced && 'focus-running__arc--smooth')}
            strokeDasharray={CIRCLE}
            strokeDashoffset={CIRCLE * (1 - left)}
          />
        </svg>
        <p
          role="timer"
          aria-live="off"
          aria-label={t('timer')}
          className={cn('focus-running__clock', paused && 'focus-running__clock--paused')}
        >
          {formatClock(clock)}
        </p>
      </div>
      {conflict && (
        <p role="status" className="focus-running__conflict">
          {t('conflict', { name: conflict })}
        </p>
      )}
      <p aria-live="polite" className="focus-running__phase">
        {label}
      </p>
      {dots.length > 0 && (
        <ol className="focus-running__dots" aria-hidden>
          {dots.map(n => {
            return <li key={n} className={cn('focus-running__dot', n <= round && 'focus-running__dot--on')} />;
          })}
        </ol>
      )}
      <div className="focus-running__actions">
        <Button onClick={onStop} disabled={pending}>
          {t('stop')}
        </Button>
        {phase !== 'done' && (
          <Button variant="outline" onClick={paused ? onResume : onPause} disabled={pending}>
            {paused ? t('resume') : t('pause')}
          </Button>
        )}
        {phase === 'break' && !paused && (
          <Button variant="outline" onClick={onSkip} disabled={pending}>
            {t('skipBreak')}
          </Button>
        )}
      </div>
    </div>
  );
};
