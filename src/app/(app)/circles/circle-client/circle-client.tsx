'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConversationHeader } from '@/app/(app)/circles/conversation-header/conversation-header';
import { Feed } from '@/app/(app)/circles/feed/feed';
import { InviteModal } from '@/app/(app)/circles/invite-modal/invite-modal';
import { LookDialog } from '@/app/(app)/circles/look-dialog/look-dialog';
import { PeopleDialog } from '@/app/(app)/circles/people-dialog/people-dialog';
import { RemoveMemberModal } from '@/app/(app)/circles/remove-member-modal/remove-member-modal';
import { SharingDialog } from '@/app/(app)/circles/sharing-dialog/sharing-dialog';
import { useSharing } from '@/app/(app)/circles/use-sharing';
import { useCircle, useCloseCircle, useLeaveCircle, useRemoveMember } from '@/app/(app)/circles/use-circles';
import { ConfirmModal } from '@/components/confirm-modal/confirm-modal';
import { EmptyState } from '@/components/empty-state/empty-state';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { Scenery } from '@/components/scenery/scenery';
import { Button } from '@/components/ui/button';
import { buildFeed } from '@/lib/circle-feed';
import { habitColor } from '@/lib/palette';
import { HttpError } from '@/lib/query/fetch-json';
import type { CircleMemberView } from '@/server/circles-view';
import './circle-client.css';

interface CircleState {
  dialog: 'invite' | 'leave' | 'close' | 'share' | 'look' | 'people' | null;
  removing: CircleMemberView | null;
}

interface CircleClientProps {
  id: string;
}

/** One circle as a conversation: friends' days as messages you can react to, and the buttons around them. */
export const CircleClient = (props: CircleClientProps) => {
  const { id } = props;

  const [state, setState] = useState<CircleState>({ dialog: null, removing: null });

  const t = useTranslations('circles');
  const router = useRouter();
  const { data: circle, error, isError, refetch } = useCircle(id);

  useSharing(id); // started now so "What I share" opens with its habits already there
  const leave = useLeaveCircle();
  const close = useCloseCircle();
  const remove = useRemoveMember();

  const { dialog, removing } = state;

  const open = (next: CircleState['dialog']) => {
    setState({ dialog: next, removing: null });
  };

  const onInviteClick = () => {
    open('invite');
  };

  const onShareClick = () => {
    open('share');
  };

  const onSettingsClick = () => {
    open('look');
  };

  const onPeopleClick = () => {
    open('people');
  };

  const onLeaveClick = () => {
    open('leave');
  };

  const onCloseCircleClick = () => {
    open('close');
  };

  const onDialogClose = () => {
    open(null);
  };

  const onRemoveClick = (member: CircleMemberView) => {
    setState({ dialog: null, removing: member });
  };

  const onRemoveClose = () => {
    setState({ dialog: null, removing: null });
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

  const { name, color, pinned, isOwner, members } = circle;
  const me = members.find(member => {
    return member.isYou;
  });
  const others = members.filter(member => {
    return !member.isYou;
  });
  const { userId: meId = '', tag: meTag = '', today = members[0].today } = me ?? {};
  const days = buildFeed(members, today);
  const style = { '--circle-color': habitColor(color) } as React.CSSProperties;

  return (
    <>
      <div style={style} className="conversation">
        <Scenery variant="backdrop" className="conversation__scenery" />
        <ConversationHeader
          circle={circle}
          onInvite={onInviteClick}
          onShare={onShareClick}
          onSettings={onSettingsClick}
          onPeople={onPeopleClick}
        />
        <Feed circleId={id} days={days} me={{ id: meId, tag: meTag }} onShare={onShareClick} />
      </div>

      {dialog === 'invite' && <InviteModal circleId={id} onClose={onDialogClose} />}
      {dialog === 'share' && me && <SharingDialog circleId={id} me={me} others={others} onClose={onDialogClose} />}
      {dialog === 'look' && (
        <LookDialog
          circleId={id}
          color={color}
          pinned={pinned}
          isOwner={isOwner}
          onLeave={onLeaveClick}
          onCloseCircle={onCloseCircleClick}
          onClose={onDialogClose}
        />
      )}
      {dialog === 'people' && (
        <PeopleDialog
          name={name}
          members={members}
          isOwner={isOwner}
          onRemove={onRemoveClick}
          onClose={onDialogClose}
        />
      )}
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
