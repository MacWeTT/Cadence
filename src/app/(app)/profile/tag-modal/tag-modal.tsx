'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useUpdateTag } from '@/app/(app)/profile/use-profile';
import { SettingModal } from '@/components/setting-modal/setting-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidTag, normaliseTag, TAG_MAX } from '@/lib/tag';
import './tag-modal.css';

interface TagModalProps {
  /** The tag now, without the @. */
  tag: string;
  onClose: () => void;
}

/** Change your tag. The @ is shown, not typed; capitals are forgiven. A tag someone else has is refused after Save. */
export const TagModal = (props: TagModalProps) => {
  const { tag, onClose } = props;

  const [form, setForm] = useState({ tag });

  const t = useTranslations('profile.tag');
  const update = useUpdateTag();

  const { tag: draft } = form;
  const clean = normaliseTag(draft);
  const valid = isValidTag(clean);

  const onTagChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ tag: event.target.value });
  };

  const onSave = () => {
    update.mutate(clean);
    onClose();
  };

  return (
    <SettingModal title={t('title')} saveDisabled={!valid || clean === tag} onSave={onSave} onClose={onClose}>
      <Label htmlFor="profile-tag">{t('label')}</Label>
      <div className="tag-modal__field">
        <span aria-hidden className="tag-modal__at">
          {t('at')}
        </span>
        <Input
          id="profile-tag"
          value={draft}
          maxLength={TAG_MAX + 1}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={draft !== '' && !valid}
          onChange={onTagChange}
          className="tag-modal__input"
        />
      </div>
      <p className={clsx('tag-modal__hint', draft !== '' && !valid && 'tag-modal__hint--error')}>
        {t('hint', { example: tag })}
      </p>
    </SettingModal>
  );
};
