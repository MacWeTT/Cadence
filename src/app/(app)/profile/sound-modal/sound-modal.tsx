'use client';

import clsx from 'clsx';
import { Upload, Volume2, VolumeX, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useRemoveSound, useUpdateSound, useUploadSound } from '@/app/(app)/profile/use-profile';
import { SettingModal } from '@/components/setting-modal/setting-modal';
import { CHIME_IDS, isChimeId, playChime, unlockAudio } from '@/lib/chimes';
import { checkSoundFile } from '@/lib/profile-schema';
import { CUSTOM_SOUND_LIMIT } from '@/lib/sound';
import { measureSound } from '@/lib/sound-duration';
import type { SoundView } from '@/server/profile-view';
import './sound-modal.css';
import { Tip } from '@/components/tip/tip';

interface SoundModalProps {
  sound: { id: string; volume: number };
  customSounds: SoundView[];
  onClose: () => void;
}

/**
 * The same shape as the avatar modal: what you would get on Save is the big tile, below are the six built-in sounds,
 * your own sounds (up to six, each at most 5 seconds), the volume, and the upload. Tapping a sound plays it.
 */
export const SoundModal = (props: SoundModalProps) => {
  const { sound, customSounds, onClose } = props;

  const [draft, setDraft] = useState(sound);

  const t = useTranslations('profile.sound');
  const tv = useTranslations('validation');
  const update = useUpdateSound();
  const upload = useUploadSound();
  const remove = useRemoveSound();
  const fileInput = useRef<HTMLInputElement>(null);

  const { id, volume } = draft;
  const { id: savedId, volume: savedVolume } = sound;
  const full = customSounds.length >= CUSTOM_SOUND_LIMIT;

  const chosen = customSounds.find(({ id: customId }) => {
    return customId === id;
  });

  const nameOf = (soundId: string): string => {
    return isChimeId(soundId) ? t(`names.${soundId}`) : (chosen?.name ?? '');
  };

  const preview = (soundId: string, url: string | null, level: number) => {
    unlockAudio();
    playChime({ id: soundId, volume: level, url }, 'focus');
  };

  const onVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft({ ...draft, volume: event.currentTarget.valueAsNumber });
  };

  const onUploadClick = () => {
    fileInput.current?.click();
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event;
    const [file] = target.files ?? [];

    target.value = '';

    if (!file) {
      return;
    }

    const { type, size } = file;
    const early = checkSoundFile({ type, size, durationMs: 1 });

    if (early) {
      toast.error(tv(early));

      return;
    }

    try {
      const durationMs = await measureSound(file);
      const problem = checkSoundFile({ type, size, durationMs });

      if (problem) {
        toast.error(tv(problem));

        return;
      }

      upload.mutate({ file, durationMs });
    } catch {
      toast.error(t('unreadable'));
    }
  };

  const onSave = () => {
    update.mutate({ id, volume, name: nameOf(id) });
    onClose();
  };

  return (
    <SettingModal
      title={t('title')}
      saveDisabled={id === savedId && volume === savedVolume}
      onSave={onSave}
      onClose={onClose}
    >
      <div className="sound-modal__current">
        <span className="sound-modal__current-tile">
          {id === 'silent' ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
        </span>
        <span className="sound-modal__caption">{t('current', { name: nameOf(id) })}</span>
      </div>

      <section>
        <h3 className="sound-modal__heading">{t('sounds')}</h3>
        <div className="sound-modal__grid">
          {CHIME_IDS.map(chimeId => {
            const active = id === chimeId;

            const onPick = () => {
              setDraft({ ...draft, id: chimeId });
              preview(chimeId, null, volume);
            };

            return (
              <button
                key={chimeId}
                type="button"
                aria-pressed={active}
                onClick={onPick}
                className={clsx('sound-modal__sound', active && 'sound-modal__sound--active')}
              >
                <span className="sound-modal__play">
                  {chimeId === 'silent' ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
                </span>
                {t(`names.${chimeId}`)}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="sound-modal__heading">{t('volume')}</h3>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          aria-label={t('volume')}
          onChange={onVolumeChange}
          className="sound-modal__volume"
        />
      </section>

      <section>
        <h3 className="sound-modal__heading">{t('yours')}</h3>
        <div className="sound-modal__grid">
          {customSounds.map(({ id: customId, name, url }) => {
            const active = id === customId;

            const onPick = () => {
              setDraft({ ...draft, id: customId });
              preview(customId, url, volume);
            };

            const onRemove = () => {
              if (active) {
                setDraft({ ...draft, id: 'bell' });
              }

              remove.mutate({ id: customId, name });
            };

            return (
              <div key={customId} className={clsx('sound-modal__sound', active && 'sound-modal__sound--active')}>
                <button type="button" aria-pressed={active} onClick={onPick} className="sound-modal__pick">
                  <span className="sound-modal__play">
                    <Volume2 aria-hidden />
                  </span>
                  <span className="sound-modal__name">{name}</span>
                </button>
                <Tip label={t('remove', { name })}>
                  <button
                    type="button"
                    aria-label={t('remove', { name })}
                    onClick={onRemove}
                    className="sound-modal__remove"
                  >
                    <X aria-hidden />
                  </button>
                </Tip>
              </div>
            );
          })}
        </div>
        <button type="button" disabled={full} onClick={onUploadClick} className="sound-modal__upload">
          <Upload aria-hidden className="sound-modal__upload-icon" />
          <span>
            {t('upload')}
            <span className="sound-modal__hint">{full ? t('limit') : t('uploadHint')}</span>
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="audio/mpeg,audio/wav,audio/ogg"
          onChange={onFileChange}
          className="sr-only"
          tabIndex={-1}
        />
      </section>
    </SettingModal>
  );
};
