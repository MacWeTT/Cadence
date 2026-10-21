'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CircleCard } from '@/app/(app)/circles/circle-card/circle-card';
import { NewCircleModal } from '@/app/(app)/circles/new-circle-modal/new-circle-modal';
import { useCircles } from '@/app/(app)/circles/use-circles';
import { EmptyState } from '@/components/empty-state/empty-state';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { Button } from '@/components/ui/button';
import './circles-client.css';

interface CirclesState {
  creating: boolean;
}

export const CirclesClient = () => {
  const [state, setState] = useState<CirclesState>({ creating: false });

  const t = useTranslations('circles');
  const { data: circles, isError, refetch } = useCircles();

  const { creating } = state;

  const onNewClick = () => {
    setState({ creating: true });
  };

  const onNewClose = () => {
    setState({ creating: false });
  };

  const onRetry = () => {
    void refetch();
  };

  if (!circles) {
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

  return (
    <>
      <div className="circles__header">
        <h1 className="circles__title">{t('title')}</h1>
        <Button onClick={onNewClick}>{t('newCircle')}</Button>
      </div>
      <p className="circles__intro">{t('intro')}</p>
      {circles.length === 0 ? (
        <EmptyState
          flush
          title={t('emptyTitle')}
          text={t('emptyText')}
          action={<Button onClick={onNewClick}>{t('emptyAction')}</Button>}
        />
      ) : (
        <ul aria-label={t('listLabel')} className="circles__list">
          {circles.map(circle => {
            return <CircleCard key={circle.id} circle={circle} />;
          })}
        </ul>
      )}
      {creating && <NewCircleModal onClose={onNewClose} />}
    </>
  );
};
