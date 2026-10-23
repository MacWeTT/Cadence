'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCircles } from '@/app/(app)/circles/use-circles';
import { circleTitle } from '@/lib/circle-people';
import './circles-card.css';

const SHOWN = 3;

/** Your circles on Home, or a gentle way to start one. It stays out of the way until the circles have loaded. */
export const CirclesCard = () => {
  const t = useTranslations('circles');
  const { data: circles } = useCircles();

  if (!circles) {
    return null;
  }

  return (
    <section aria-labelledby="circles-card-heading" className="circles-card">
      <h2 id="circles-card-heading" className="circles-card__title">
        {t('home.title')}
      </h2>
      {circles.length === 0 ? (
        <>
          <p className="circles-card__text">{t('home.empty')}</p>
          <Link href="/circles" className="circles-card__link">
            {t('home.start')}
          </Link>
        </>
      ) : (
        <>
          <ul className="circles-card__list">
            {circles.slice(0, SHOWN).map(circle => {
              const { id, memberCount, kind } = circle;

              return (
                <li key={id}>
                  <Link href={`/circles/${id}`} className="circles-card__item">
                    <span className="circles-card__name">{circleTitle(circle) ?? t('pair.waiting')}</span>
                    <span className="circles-card__count">
                      {kind === 'pair' ? t('pair.label') : t('people', { count: memberCount })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link href="/circles" className="circles-card__link">
            {t('home.all')}
          </Link>
        </>
      )}
    </section>
  );
};
