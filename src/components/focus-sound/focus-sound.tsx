'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CHIME_IDS, playChime, unlockAudio, type ChimeId } from '@/lib/chimes';
import { useChimeChoice } from '@/lib/use-chime-choice';
import { cn } from '@/lib/utils';
import './focus-sound.css';

/** Choose the chime and its volume. Tapping a round button picks it and plays it. Kept on this device for now. */
export const FocusSound = () => {
  const t = useTranslations('focus.sound');
  const [choice, save] = useChimeChoice();

  const { id: chosen, volume } = choice;

  const onPick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = { ...choice, id: event.currentTarget.value as ChimeId };

    save(next);
    unlockAudio();
    playChime(next, 'focus');
  };

  const onVolume = (event: React.ChangeEvent<HTMLInputElement>) => {
    save({ ...choice, volume: event.currentTarget.valueAsNumber });
  };

  return (
    <fieldset className="focus-sound">
      <legend className="focus-sound__legend">{t('title')}</legend>
      <div role="radiogroup" aria-label={t('title')} className="focus-sound__list">
        {CHIME_IDS.map(id => {
          const Icon = id === 'silent' ? VolumeX : Volume2;

          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === chosen}
              value={id}
              onClick={onPick}
              className={cn('focus-sound__option', id === chosen && 'focus-sound__option--on')}
            >
              <span className="focus-sound__circle">
                <Icon aria-hidden className="focus-sound__icon" />
              </span>
              <span className="focus-sound__name">{t(id)}</span>
            </button>
          );
        })}
      </div>
      <label className="focus-sound__volume">
        <span>{t('volume')}</span>
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={onVolume} />
      </label>
    </fieldset>
  );
};
