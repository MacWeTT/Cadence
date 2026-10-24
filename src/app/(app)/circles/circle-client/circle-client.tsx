'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConversationHeader } from '@/app/(app)/circles/conversation-header/conversation-header';
import { Feed } from '@/app/(app)/circles/feed/feed';
import { InviteModal } from '@/app/(app)/circles/invite-modal/invite-modal';
import { LookDialog } from '@/app/(app)/circles/look-dialog/look-dialog';
import { PairWaiting } from '@/app/(app)/circles/pair-waiting/pair-waiting';
import { PeopleDialog } from '@/app/(app)/circles/people-dialog/people-dialog';
import { RemoveMemberModal } from '@/app/(app)/circles/remove-member-modal/remove-member-modal';
import { SharingDialog } from '@/app/(app)/circles/sharing-dialog/sharing-dialog';
import { useSharing } from '@/app/(app)/circles/use-sharing';
import { WeekTogether } from '@/app/(app)/circles/week-together/week-together';
import { useCircle, useCloseCircle, useLeaveCircle, useRemoveMember } from '@/app/(app)/circles/use-circles';
import { ConfirmModal } from '@/components/confirm-modal/confirm-modal';
import { EmptyState } from '@/components/empty-state/empty-state';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { Scenery } from '@/components/scenery/scenery';
import { Button } from '@/components/ui/button';
import { buildFeed } from '@/lib/circle-feed';
import { circleColor, memberName } from '@/lib/circle-people';
import { habitColor } from '@/lib/palette';
import { HttpError } from '@/lib/query/fetch-json';
import { weekTogether } from '@/lib/week-together';
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

  const { name, color, pinned, isOwner, members, kind, closerActive, weekTicks } = circle;
  const me = members.find(member => {
    return member.isYou;
  });
  const others = members.filter(member => {
    return !member.isYou;
  });
  const { userId: meId = '', tag: meTag = '', today = members[0].today } = me ?? {};
  const days = buildFeed(members, today);
  const pair = kind === 'pair';
  const waiting = pair && others.length === 0;
  const [partner] = others;
  const { displayName: partnerDisplay = null, tag: partnerTag = '' } = partner ?? {};
  const partnerName = partner ? memberName(partnerDisplay, partnerTag) : null;
  const title = pair ? (partnerName ? t('pair.title', { name: partnerName }) : t('pair.waiting')) : name;
  const shownColor = circleColor(kind, color);
  const subtitle = pair
    ? t(closerActive ? 'pair.subtitleCloser' : 'pair.subtitle')
    : t('circle.week', { count: weekTicks });
  const together = pair ? weekTogether(members, today) : null;
  const style = { '--circle-color': habitColor(shownColor) } as React.CSSProperties;

  return (
    <>
      <div style={style} className="conversation">
        <Scenery variant="backdrop" tone={pair ? 'pair' : undefined} className="conversation__scenery" />
        <ConversationHeader
          circle={{ ...circle, color: shownColor }}
          title={title}
          subtitle={subtitle}
          canInvite={isOwner && (!pair || waiting)}
          onInvite={onInviteClick}
          onShare={onShareClick}
          onSettings={onSettingsClick}
          onPeople={onPeopleClick}
        />
        {waiting ? (
          <PairWaiting isOwner={isOwner} onInvite={onInviteClick} />
        ) : (
          <>
            {together && <WeekTogether together={together} members={members} />}
            <Feed circleId={id} days={days} me={{ id: meId, tag: meTag }} onShare={onShareClick} />
          </>
        )}
      </div>

      {dialog === 'invite' && <InviteModal circleId={id} onClose={onDialogClose} />}
      {dialog === 'share' && me && (
        <SharingDialog
          circleId={id}
          me={me}
          others={others}
          pair={pair ? { closerActive, partner: partnerName ?? t('pair.waiting') } : null}
          onClose={onDialogClose}
        />
      )}
      {dialog === 'look' && (
        <LookDialog
          circleId={id}
          color={color}
          pinned={pinned}
          isOwner={isOwner}
          pair={pair}
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
          title={
            pair
              ? partnerName
                ? t('pair.endTitle', { name: partnerName })
                : t('pair.endTitleWaiting')
              : t('confirm.leaveTitle', { name })
          }
          description={pair ? t('pair.endText') : t('confirm.leaveText')}
          confirmLabel={pair ? t('pair.endConfirm') : t('confirm.leaveConfirm')}
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
