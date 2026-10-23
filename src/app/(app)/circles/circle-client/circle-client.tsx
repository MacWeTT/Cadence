'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { InviteModal } from '@/app/(app)/circles/invite-modal/invite-modal';
import { MemberRow } from '@/app/(app)/circles/member-row/member-row';
import { SharingSection } from '@/app/(app)/circles/sharing-section/sharing-section';
import { RemoveMemberModal } from '@/app/(app)/circles/remove-member-modal/remove-member-modal';
import { useCircle, useCloseCircle, useLeaveCircle, useRemoveMember } from '@/app/(app)/circles/use-circles';
import { ConfirmModal } from '@/components/confirm-modal/confirm-modal';
import { EmptyState } from '@/components/empty-state/empty-state';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { Button } from '@/components/ui/button';
import { HttpError } from '@/lib/query/fetch-json';
import type { CircleMemberView } from '@/server/circles-view';
import './circle-client.css';

interface CircleState {
  dialog: 'invite' | 'leave' | 'close' | null;
  removing: CircleMemberView | null;
}

interface CircleClientProps {
  id: string;
}

export const CircleClient = (props: CircleClientProps) => {
  const { id } = props;

  const [state, setState] = useState<CircleState>({ dialog: null, removing: null });

  const t = useTranslations('circles');
  const router = useRouter();
  const { data: circle, error, isError, refetch } = useCircle(id);
  const leave = useLeaveCircle();
  const close = useCloseCircle();
  const remove = useRemoveMember();

  const { dialog, removing } = state;

  const setField = <K extends keyof CircleState>(field: K, value: CircleState[K]) => {
    setState(current => {
      return { ...current, [field]: value };
    });
  };

  const onInviteClick = () => {
    setField('dialog', 'invite');
  };

  const onLeaveClick = () => {
    setField('dialog', 'leave');
  };

  const onCloseCircleClick = () => {
    setField('dialog', 'close');
  };

  const onDialogClose = () => {
    setField('dialog', null);
  };

  const onRemoveClick = (member: CircleMemberView) => {
    setField('removing', member);
  };

  const onRemoveClose = () => {
    setField('removing', null);
  };

  const onLeaveConfirm = () => {
    leave.mutate(id, {
      onSuccess: () => {
        router.push('/circles');
      },
    });
    onDialogClose();
  };

  const onCloseConfirm = () => {
    close.mutate(id, {
      onSuccess: () => {
        router.push('/circles');
      },
    });
    onDialogClose();
  };

  const onRemoveConfirm = () => {
    if (removing) {
      remove.mutate({ circleId: id, userId: removing.userId });
    }

    onRemoveClose();
  };

  const onRetry = () => {
    void refetch();
  };

  if (!circle) {
    if (error instanceof HttpError && error.status === 404) {
      return (
        <EmptyState
          flush
          title={t('circle.notFoundTitle')}
          text={t('circle.notFoundText')}
          action={
            <Button asChild>
              <Link href="/circles">{t('circle.backToList')}</Link>
            </Button>
          }
        />
      );
    }

    return isError ? (
      <EmptyState
        flush
        title={t('loadFailedTitle')}
        text={t('loadFailedText')}
        action={<Button onClick={onRetry}>{t('retry')}</Button>}
      />
    ) : (
      <ListSkeleton title={t('title')} />
    );
  }

  const { name, isOwner, members } = circle;
  const others = members.filter(member => {
    return !member.isYou;
  });

  return (
    <>
      <Link href="/circles" className="circle__back">
        {t('circle.back')}
      </Link>
      <div className="circle__header">
        <h1 className="circle__title">{name}</h1>
        <div className="circle__actions">
          {isOwner && <Button onClick={onInviteClick}>{t('circle.invite')}</Button>}
          <Button variant="outline" onClick={onLeaveClick}>
            {t('circle.leave')}
          </Button>
          {isOwner && (
            <Button variant="outline" onClick={onCloseCircleClick}>
              {t('circle.close')}
            </Button>
          )}
        </div>
      </div>
      <section aria-labelledby="circle-members" className="circle__members">
        <h2 id="circle-members" className="circle__subtitle">
          {t('circle.members')}
        </h2>
        <ul>
          {members.map(member => {
            const { userId, isYou } = member;

            return <MemberRow key={userId} member={member} canRemove={isOwner && !isYou} onRemove={onRemoveClick} />;
          })}
        </ul>
      </section>

      <SharingSection circleId={id} others={others} />

      {dialog === 'invite' && <InviteModal circleId={id} onClose={onDialogClose} />}
      {dialog === 'leave' && (
        <ConfirmModal
          destructive
          title={t('confirm.leaveTitle', { name })}
          description={t('confirm.leaveText')}
          confirmLabel={t('confirm.leaveConfirm')}
          onConfirm={onLeaveConfirm}
          onClose={onDialogClose}
        />
      )}
      {dialog === 'close' && (
        <ConfirmModal
          destructive
          title={t('confirm.closeTitle', { name })}
          description={t('confirm.closeText')}
          confirmLabel={t('confirm.closeConfirm')}
          onConfirm={onCloseConfirm}
          onClose={onDialogClose}
        />
      )}
      {removing && <RemoveMemberModal member={removing} onConfirm={onRemoveConfirm} onClose={onRemoveClose} />}
    </>
  );
};
