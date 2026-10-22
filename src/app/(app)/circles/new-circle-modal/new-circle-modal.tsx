'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCreateCircle } from '@/app/(app)/circles/use-circles';
import { ConfirmModal } from '@/components/confirm-modal/confirm-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CIRCLE_LIMITS, circleNameProblem } from '@/domain/circles';

interface NewCircleModalProps {
  onClose: () => void;
}

/** Asks for a name, makes the circle, and opens it. */
export const NewCircleModal = (props: NewCircleModalProps) => {
  const { onClose } = props;

  const [form, setForm] = useState({ name: '' });

  const t = useTranslations('circles.new');
  const router = useRouter();
  const create = useCreateCircle();

  const { name } = form;
  const trimmed = name.trim();
  const blocked = circleNameProblem(trimmed) !== null || create.isPending;

  const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ name: event.target.value });
  };

  // The modal stays open until the circle exists, so a refusal shows its toast without losing what was typed.
  const onConfirm = () => {
    if (blocked) {
      return;
    }

    create.mutate(trimmed, {
      onSuccess: id => {
        onClose();
        router.push(`/circles/${id}`);
      },
    });
  };

  const onNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onConfirm();
    }
  };

  return (
    <ConfirmModal
      title={t('title')}
      description={t('description')}
      confirmLabel={t('create')}
      confirmDisabled={blocked}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <Label htmlFor="circle-name">{t('label')}</Label>
      <Input
        id="circle-name"
        value={name}
        maxLength={CIRCLE_LIMITS.nameMax}
        placeholder={t('placeholder')}
        autoComplete="off"
        onChange={onNameChange}
        onKeyDown={onNameKeyDown}
      />
    </ConfirmModal>
  );
};
