import { useTranslations } from 'next-intl';
import { Arrive } from '@/components/arrive/arrive';
import { InlineText } from '@/components/changelog-entry/inline-text';
import type { ChangelogEntry } from '@/lib/changelog';
import { cn } from '@/lib/utils';
import './changelog-entry.css';

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  /** A heading to use instead of the entry's own ("Latest update", not "Version 1.0.1"). */
  heading?: string;
  /** Its place in the list: later cards come in a little after earlier ones. */
  index: number;
}

/** One section of the changelog: a release with its date and what it added, or what is coming soon. */
export const ChangelogEntryCard = (props: ChangelogEntryCardProps) => {
  const { entry, index, heading: given } = props;

  const t = useTranslations('changelog');

  const { title, date, kind, note, items } = entry;
  const heading =
    given ??
    {
      planned: t('comingSoon'),
      known: t('knownIssues'),
      release: t('version', { version: title }),
      highlights: title,
    }[kind];
  const id = `changelog-${title}`;

  return (
    <Arrive index={index}>
      <section aria-labelledby={id} className={cn('changelog-entry', kind !== 'release' && `changelog-entry--${kind}`)}>
        <div className="changelog-entry__head">
          <h2 id={id} className="changelog-entry__title">
            {heading}
          </h2>
          {date && <time dateTime={date}>{date}</time>}
        </div>
        {note && <p className="changelog-entry__note">{note}</p>}
        <ul className="changelog-entry__items">
          {items.map((item, i) => {
            return (
              <li key={i} className="changelog-entry__item">
                <InlineText parts={item} />
              </li>
            );
          })}
        </ul>
      </section>
    </Arrive>
  );
};
