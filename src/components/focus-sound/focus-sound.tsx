'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useProfile } from '@/app/(app)/profile/use-profile';
import { useFocusApi } from '@/components/focus-host/focus-context';
import { useChimeChoice } from '@/components/focus-host/use-chime-choice';
import { CHIME_IDS, isChimeId, playChime, sessionChoice, unlockAudio } from '@/lib/chimes';
import { cn } from '@/lib/utils';
import './focus-sound.css';

interface FocusSoundProps {
  /** The sound chosen for this session; `null` follows the profile sound. */
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * The sound for this focus session. It opens on the profile sound (the default); any other choice, one of the built-in
 * sounds or one of your own, is only for this activity. Volume is the profile's, changed there.
 */
export const FocusSound = (props: FocusSoundProps) => {
  const { value, onChange } = props;

  const t = useTranslations('focus.sound');
  const tn = useTranslations('profile.sound.names');
  const base = useChimeChoice();
  const { data } = useProfile();
  const { closePanel } = useFocusApi();

  const customSounds = data?.customSounds ?? [];
  const { id: defaultId } = base;
  const defaultName = isChimeId(defaultId)
    ? tn(defaultId)
    : (customSounds.find(({ id }) => {
        return id === defaultId;
      })?.name ?? tn('bell'));

  const onPick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const { value: picked } = event.currentTarget;
    const next = picked === '' ? null : picked;

    onChange(next);
    unlockAudio();
    playChime(sessionChoice(next, base, customSounds), 'focus');
  };

  const options = [
    { id: '', name: t('default', { name: defaultName }), silent: defaultId === 'silent' },
    ...CHIME_IDS.map(id => {
      return { id, name: tn(id), silent: id === 'silent' };
    }),
    ...customSounds.map(({ id, name }) => {
      return { id, name, silent: false };
    }),
  ];

  return (
    <fieldset className="focus-sound">
      <legend className="focus-sound__legend">{t('title')}</legend>
      <div role="radiogroup" aria-label={t('title')} className="focus-sound__list">
        {options.map(({ id, name, silent }) => {
          const on = (value ?? '') === id;
          const Icon = silent ? VolumeX : Volume2;

          return (
            <button
              key={id || 'default'}
              type="button"
              role="radio"
              aria-checked={on}
              value={id}
              onClick={onPick}
              className={cn('focus-sound__option', on && 'focus-sound__option--on')}
            >
              <span className="focus-sound__circle">
                <Icon aria-hidden className="focus-sound__icon" />
              </span>
              <span className="focus-sound__name">{name}</span>
            </button>
          );
        })}
      </div>
      <Link href="/profile" onClick={closePanel} className="focus-sound__change">
        {t('change')}
      </Link>
    </fieldset>
  );
};
