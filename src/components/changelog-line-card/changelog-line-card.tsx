import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Arrive } from '@/components/arrive/arrive';
import { InlineText } from '@/components/changelog-entry/inline-text';
import type { ChangelogLine } from '@/lib/changelog';
import { cn } from '@/lib/utils';
import './changelog-line-card.css';

interface ChangelogLineCardProps {
  group: ChangelogLine;
  /** The newest line is drawn bigger, with its latest release's notes in full. */
  featured: boolean;
  /** Its place in the list: later cards come in a little after earlier ones. */
  index: number;
}

/** A minor line (0.8) as one big card: its headline and highlights, and a way to the full notes of every release in it. */
export const ChangelogLineCard = (props: ChangelogLineCardProps) => {
  const { group, featured, index } = props;
  const { line, releases, from, to, date, headline, highlights } = group;

  const t = useTranslations('changelog');

  const [{ title: latestTitle, note: latestNote, items: latestItems }] = releases;
  const id = `changelog-line-${line}`;
  const span = from === to ? t('version', { version: to }) : t('range', { from, to });

  return (
    <Arrive index={index}>
      <section aria-labelledby={id} className={cn('changelog-line', featured && 'changelog-line--featured')}>
        <div className="changelog-line__head">
          <h2 id={id} className="changelog-line__title">
            {t('line', { line })}
          </h2>
          {date && <time dateTime={date}>{date}</time>}
        </div>
        <p className="changelog-line__span">{span}</p>
        {headline && <p className="changelog-line__headline">{headline}</p>}
        <ul className="changelog-line__items">
          {highlights.map((item, i) => {
            return (
              <li key={i} className="changelog-line__item">
                <InlineText parts={item} />
              </li>
            );
          })}
        </ul>
        {featured && releases.length > 1 && (
          <div className="changelog-line__latest">
            <h3 className="changelog-line__latest-title">{t('latest', { version: latestTitle })}</h3>
            {latestNote && <p className="changelog-line__latest-note">{latestNote}</p>}
            <ul className="changelog-line__items">
              {latestItems.map((item, i) => {
                return (
                  <li key={i} className="changelog-line__item">
                    <InlineText parts={item} />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <Link href={`/changelog/all#changelog-${latestTitle}`} className="changelog-line__more">
          {t('seeLine', { line })}
        </Link>
      </section>
    </Arrive>
  );
};
