'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Bubble } from '@/app/(app)/circles/bubble/bubble';
import { Scenery } from '@/components/scenery/scenery';
import { Button } from '@/components/ui/button';
import type { FeedDay } from '@/lib/circle-feed';
import { formatCalendarDate } from '@/lib/format';
import './feed.css';

interface FeedProps {
  circleId: string;
  days: FeedDay[];
  me: { id: string; tag: string };
  /** Opens "What I share", from the quiet-day message. */
  onShare: () => void;
}

/** The circle as a conversation, oldest first, scrolled to the latest. Each day has a divider, each friend a bubble. */
export const Feed = (props: FeedProps) => {
  const { circleId, days, me, onShare } = props;

  const t = useTranslations('circles.conversation');
  const scroller = useRef<HTMLDivElement>(null);

  const { length } = days;

  // Open at the latest messages, and follow a new one.
  useEffect(() => {
    const element = scroller.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [length]);

  if (length === 0) {
    return (
      <div className="feed feed--empty">
        <Scenery variant="scene" />
        <h2 className="feed__empty-title">{t('emptyTitle')}</h2>
        <p className="feed__empty-text">{t('emptyText')}</p>
        <Button variant="outline" onClick={onShare}>
          {t('emptyAction')}
        </Button>
      </div>
    );
  }

  return (
    <div ref={scroller} className="feed" tabIndex={0} role="log" aria-label={t('feedLabel')}>
      {days.map(({ date, when, bubbles }) => {
        const label =
          when === 'earlier'
            ? formatCalendarDate(date, { weekday: 'long', day: 'numeric', month: 'long' })
            : t(when === 'today' ? 'today' : 'yesterday');

        return (
          <section key={date} aria-label={label} className="feed__day">
            <h3 className="feed__divider">
              <span className="feed__divider-label">{label}</span>
            </h3>
            <ul className="feed__bubbles">
              {bubbles.map(bubble => {
                return <Bubble key={bubble.key} circleId={circleId} bubble={bubble} me={me} />;
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
