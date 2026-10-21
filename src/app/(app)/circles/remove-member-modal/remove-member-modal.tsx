'use client';

import { useTranslations } from 'next-intl';
import { ConfirmModal } from '@/components/confirm-modal/confirm-modal';
import { memberName } from '@/lib/circle-people';
import type { CircleMemberView } from '@/server/circles-view';

interface RemoveMemberModalProps {
  member: CircleMemberView;
  onConfirm: () => void;
  onClose: () => void;
}

/** Asks the owner to confirm taking someone out of the circle. */
export const RemoveMemberModal = (props: RemoveMemberModalProps) => {
  const { member, onConfirm, onClose } = props;
  const { displayName, tag } = member;

  const t = useTranslations('circles.confirm');

  return (
    <ConfirmModal
      destructive
      title={t('removeTitle', { who: memberName(displayName, tag) })}
      description={t('removeText')}
      confirmLabel={t('removeConfirm')}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};
