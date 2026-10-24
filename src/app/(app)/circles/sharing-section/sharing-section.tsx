import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { OverrideModal } from '@/app/(app)/circles/override-modal/override-modal';
import { ShareRow } from '@/app/(app)/circles/share-row/share-row';
import {
  useSetOverride,
  useSetPaused,
  useSetShare,
  useSetShareMisses,
  useSharing,
} from '@/app/(app)/circles/use-sharing';
import type { Label, Level } from '@/domain/circles';
import type { SharedByMeView } from '@/server/circle-sharing-view';
import type { CircleMemberView } from '@/server/circles-view';
import './sharing-section.css';

interface SharingSectionProps {
  circleId: string;
  /** The other people in the circle. */
  others: CircleMemberView[];
  /** A pair, and whether your own Closer switch is on: then Everything habits can show their off days. */
  pair: boolean;
  closerOn: boolean;
}

interface SharingState {
  customising: string | null;
}

/** "What I share here": every habit with the level this circle sees, the per-person tweaks, and the pause switch. */
export const SharingSection = (props: SharingSectionProps) => {
  const { circleId, others, pair, closerOn } = props;

  const [state, setState] = useState<SharingState>({ customising: null });

  const t = useTranslations('circles.sharing');
  const { data } = useSharing(circleId);
  const share = useSetShare(circleId);
  const override = useSetOverride(circleId);
  const pause = useSetPaused(circleId);
  const misses = useSetShareMisses(circleId);

  const { customising } = state;

  const onLevel = (habitId: string, level: Level) => {
    share.mutate({ habitId, circleId, level });
  };

  const onLabel = (habitId: string, level: Level, label: Label) => {
    share.mutate({ habitId, circleId, level, label });
  };

  const onCustomise = (habit: SharedByMeView) => {
    setState({ customising: habit.id });
  };

  const onCustomiseClose = () => {
    setState({ customising: null });
  };

  const onOverride = (habitId: string, viewerId: string, level: Level | 'inherit', label: Label) => {
    override.mutate({ habitId, circleId, viewerId, level, label });
  };

  const onMisses = (habitId: string, on: boolean) => {
    misses.mutate({ habitId, circleId, on });
  };

  const onPausedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    pause.mutate(event.target.checked);
  };

  const { paused, habits } = data ?? { paused: false, habits: [] };
  const open = habits.find(habit => {
    return habit.id === customising;
  });

  return (
    <section aria-label={t('title')} className="sharing-section">
      {data && (
        <>
          <label className="sharing-section__pause">
            <input type="checkbox" role="switch" checked={paused} onChange={onPausedChange} />
            <span>
              <span className="sharing-section__pause-title">{t('pause')}</span>
              <span className="sharing-section__pause-text">{t('pauseText')}</span>
            </span>
          </label>
          {habits.length === 0 ? (
            <p className="sharing-section__empty">{t('noHabits')}</p>
          ) : (
            <ul>
              {habits.map(habit => {
                return (
                  <ShareRow
                    key={habit.id}
                    habit={habit}
                    canCustomise={others.length > 0}
                    canShowMisses={pair && closerOn}
                    onLevel={onLevel}
                    onLabel={onLabel}
                    onCustomise={onCustomise}
                    onMisses={onMisses}
                  />
                );
              })}
            </ul>
          )}
        </>
      )}
      {open && <OverrideModal habit={open} members={others} onChange={onOverride} onClose={onCustomiseClose} />}
    </section>
  );
};
