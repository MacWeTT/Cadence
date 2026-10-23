'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { NewCircleModal } from '@/app/(app)/circles/new-circle-modal/new-circle-modal';
import { RailItem } from '@/app/(app)/circles/rail-item/rail-item';
import { useCircles } from '@/app/(app)/circles/use-circles';
import { Button } from '@/components/ui/button';
import './circles-rail.css';

interface RailState {
  creating: boolean;
}

/** Your circles as a list, pinned ones first, with the open one marked. */
export const CirclesRail = () => {
  const [state, setState] = useState<RailState>({ creating: false });

  const t = useTranslations('circles');
  const pathname = usePathname();
  const { data: circles, isError, refetch } = useCircles();

  const { creating } = state;
  const [, , openId] = pathname.split('/');

  const onNewClick = () => {
    setState({ creating: true });
  };

  const onNewClose = () => {
    setState({ creating: false });
  };

  const onRetry = () => {
    void refetch();
  };

  return (
    <nav aria-label={t('listLabel')} className="circles-rail">
      <div className="circles-rail__header">
        <h1 className="circles-rail__title">{t('title')}</h1>
        <Button size="sm" onClick={onNewClick}>
          {t('newCircle')}
        </Button>
      </div>
      {circles && circles.length > 0 && (
        <ul className="circles-rail__list">
          {circles.map(circle => {
            const { id } = circle;

            return <RailItem key={id} circle={circle} active={id === openId} />;
          })}
        </ul>
      )}
      {circles?.length === 0 && (
        <div className="circles-rail__empty">
          <p className="circles-rail__empty-title">{t('emptyTitle')}</p>
          <p className="circles-rail__empty-text">{t('emptyText')}</p>
        </div>
      )}
      {!circles && !isError && <p className="circles-rail__note">{t('loading')}</p>}
      {isError && (
        <div className="circles-rail__empty">
          <p className="circles-rail__empty-title">{t('loadFailedTitle')}</p>
          <p className="circles-rail__empty-text">{t('loadFailedText')}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t('retry')}
          </Button>
        </div>
      )}
      {creating && <NewCircleModal onClose={onNewClose} />}
    </nav>
  );
};
