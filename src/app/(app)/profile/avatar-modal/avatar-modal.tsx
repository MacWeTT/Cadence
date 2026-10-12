'use client';

import clsx from 'clsx';
import { Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EmojiField } from '@/app/(app)/habits/emoji-field/emoji-field';
import { useUpdateAvatar, useUploadPhoto } from '@/app/(app)/profile/use-profile';
import { Avatar } from '@/components/avatar/avatar';
import { AvatarCharacter } from '@/components/avatar-character/avatar-character';
import { HexColorPicker } from '@/components/hex-color-picker/hex-color-picker';
import { SettingModal } from '@/components/setting-modal/setting-modal';
import { ACCENT_SWATCH } from '@/lib/appearance';
import { CHARACTER_IDS, EMOJI_CHOICES, type CharacterId } from '@/lib/avatar';
import { cropToSquare } from '@/lib/crop-square';
import { checkPhotoFile } from '@/lib/profile-schema';
import type { AvatarView } from '@/server/profile-view';
import './avatar-modal.css';

interface AvatarModalProps {
  avatar: AvatarView;
  name: string;
  onClose: () => void;
}

interface AvatarDraft {
  /** What the big circle shows, and what Save would apply. */
  shown: AvatarView;
  /** A photo chosen in this modal, already cropped square, waiting for Save. */
  photo: File | null;
  /** The colour to give a character or emoji picked next. */
  color: string;
}

const MORE_EMOJI = '＋';
const DEFAULT_COLOR = ACCENT_SWATCH.moss;

/**
 * The big circle is what Save would apply: it starts as the current avatar and changes as another is picked. The Google
 * picture is where everyone starts and is not offered again. A character or an emoji takes a colour; a photo is cropped
 * to a square in the browser (there is no cropper yet).
 */
export const AvatarModal = (props: AvatarModalProps) => {
  const { avatar, name, onClose } = props;

  const [draft, setDraft] = useState<AvatarDraft>({ shown: avatar, photo: null, color: avatar.color ?? DEFAULT_COLOR });

  const t = useTranslations('profile.avatar');
  const tv = useTranslations('validation');
  const updateAvatar = useUpdateAvatar();
  const uploadPhoto = useUploadPhoto();
  const fileInput = useRef<HTMLInputElement>(null);

  const { kind: savedKind, value: savedValue, color: savedColor } = avatar;
  const { shown, photo, color } = draft;
  const { kind, value } = shown;
  const tinted = kind === 'character' || kind === 'emoji';
  const shownName =
    kind === 'character' && value
      ? t(`characterNames.${value as CharacterId}`)
      : kind === 'emoji' && value
        ? value
        : t(`names.${kind === 'photo' ? 'photo' : 'google'}`);
  const changed = photo !== null || kind !== savedKind || value !== savedValue || (tinted && color !== savedColor);

  // A photo chosen here is shown from a local link, which is let go of when it is replaced or the modal closes.
  useEffect(() => {
    const { url } = shown;

    return () => {
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [shown]);

  const pickCharacter = (id: CharacterId) => {
    setDraft({ ...draft, photo: null, shown: { kind: 'character', value: id, color, url: null } });
  };

  const pickEmoji = (emoji: string) => {
    setDraft({ ...draft, photo: null, shown: { kind: 'emoji', value: emoji, color, url: null } });
  };

  const pickColor = (next: string) => {
    setDraft({ ...draft, color: next, shown: tinted ? { ...shown, color: next } : shown });
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
    const problem = checkPhotoFile({ type, size });

    if (problem) {
      toast.error(tv(problem));

      return;
    }

    try {
      const cropped = await cropToSquare(file);
      const tooBig = checkPhotoFile({ type: cropped.type, size: cropped.size });

      if (tooBig) {
        toast.error(tv(tooBig));

        return;
      }

      setDraft({
        ...draft,
        photo: cropped,
        shown: { kind: 'photo', value: null, color: null, url: URL.createObjectURL(cropped) },
      });
    } catch {
      toast.error(tv('photoType'));
    }
  };

  const onSave = () => {
    if (photo) {
      uploadPhoto.mutate(photo);
    } else if ((kind === 'character' || kind === 'emoji') && value) {
      updateAvatar.mutate({ kind, value, color } as Parameters<typeof updateAvatar.mutate>[0]);
    }

    onClose();
  };

  return (
    <SettingModal title={t('title')} saveDisabled={!changed} onSave={onSave} onClose={onClose}>
      <div className="avatar-modal__current">
        <Avatar avatar={shown} name={name} size="xl" className="avatar-modal__preview" />
        <span className="avatar-modal__caption">
          {t(changed ? 'captionPreview' : 'captionCurrent', { name: shownName })}
        </span>
      </div>

      <section>
        <h3 className="avatar-modal__heading">{t('characters')}</h3>
        <div className="avatar-modal__tiles">
          {CHARACTER_IDS.map(id => {
            const active = kind === 'character' && value === id;

            const onPick = () => {
              pickCharacter(id);
            };

            return (
              <button
                key={id}
                type="button"
                aria-label={t(`characterNames.${id}`)}
                title={t(`characterNames.${id}`)}
                aria-pressed={active}
                onClick={onPick}
                className={clsx('avatar-modal__tile', active && 'avatar-modal__tile--active')}
                style={{ '--avatar-color': color } as React.CSSProperties}
              >
                <AvatarCharacter id={id} color={color} />
              </button>
            );
          })}
        </div>
      </section>

      {tinted && (
        <section>
          <h3 className="avatar-modal__heading">{t('colour')}</h3>
          <HexColorPicker value={color} onChange={pickColor} />
        </section>
      )}

      <section>
        <h3 className="avatar-modal__heading">{t('emoji')}</h3>
        <div className="avatar-modal__tiles">
          {EMOJI_CHOICES.map(emoji => {
            const active = kind === 'emoji' && value === emoji;

            const onPick = () => {
              pickEmoji(emoji);
            };

            return (
              <button
                key={emoji}
                type="button"
                aria-pressed={active}
                onClick={onPick}
                className={clsx(
                  'avatar-modal__tile',
                  'avatar-modal__tile--emoji',
                  active && 'avatar-modal__tile--active',
                )}
              >
                {emoji}
              </button>
            );
          })}
          <EmojiField value={MORE_EMOJI} onChange={pickEmoji} />
        </div>
      </section>

      <section>
        <h3 className="avatar-modal__heading">{t('photo')}</h3>
        <button type="button" onClick={onUploadClick} className="avatar-modal__upload">
          <Upload aria-hidden className="avatar-modal__upload-icon" />
          <span>
            {t('upload')}
            <span className="avatar-modal__hint">{t('photoHint')}</span>
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          className="sr-only"
          tabIndex={-1}
        />
      </section>
    </SettingModal>
  );
};
