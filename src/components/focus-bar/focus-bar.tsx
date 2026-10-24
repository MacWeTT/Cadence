'use client';

import { useTranslations } from 'next-intl';
import { useFocusApi } from '@/components/focus-host/focus-context';
import { usePhaseLabel } from '@/components/focus-host/use-phase-label';
import { formatClock, type SessionView } from '@/lib/focus-clock';
import { habitColor } from '@/lib/palette';
import { toColorKey } from '@/server/habit-view';
import type { FocusSession } from '@/server/focus-view';
import './focus-bar.css';
import { WhyDisabled } from '@/components/why-disabled/why-disabled';

interface RunningBarProps {
  session: FocusSession;
  view: SessionView;
}

const RunningBar = (props: RunningBarProps) => {
  const { session, view } = props;
  const { name, icon, color } = session.habit;

  const t = useTranslations('focus.bar');
  const tw = useTranslations('common.why');
  const { openRunning, stop, pause, resume, pending } = useFocusApi();
  const { paused, phase: current } = view;
  const phase = usePhaseLabel(view);

  return (
    <section className="focus-bar" aria-label={t('label')}>
      <div className="focus-bar__inner">
        <button type="button" className="focus-bar__open" onClick={openRunning} aria-label={t('open', { name })}>
          <span
            aria-hidden
            className="focus-bar__icon"
            style={{ backgroundColor: `color-mix(in oklab, ${habitColor(toColorKey(color))} 22%, var(--surface))` }}
          >
            {icon}
          </span>
          <span className="focus-bar__name">{name}</span>
          <span className="focus-bar__phase">{phase}</span>
          <span className="focus-bar__time">{formatClock(view.clock)}</span>
        </button>
        {current !== 'done' && (
          <WhyDisabled reason={pending ? tw('busy') : null}>
            <button type="button" className="focus-bar__pause" onClick={paused ? resume : pause} disabled={pending}>
              {paused ? t('resume') : t('pause')}
            </button>
          </WhyDisabled>
        )}
        <WhyDisabled reason={pending ? tw('busy') : null}>
          <button type="button" className="focus-bar__stop" onClick={stop} disabled={pending}>
            {t('stop')}
          </button>
        </WhyDisabled>
      </div>
    </section>
  );
};

/** A slim bar on every page while a session runs; tapping it reopens the panel. */
export const FocusBar = () => {
  const { session, view } = useFocusApi();

  return session && view ? <RunningBar session={session} view={view} /> : null;
};
