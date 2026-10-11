import { useTranslations } from 'next-intl';
import { Arrive } from '@/components/arrive/arrive';
import type { ChangelogEntry } from '@/lib/changelog';
import { cn } from '@/lib/utils';
import './changelog-entry.css';

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  /** Its place in the list: later cards come in a little after earlier ones. */
  index: number;
}

/** One section of the changelog: a release with its date and what it added, or what is coming soon. */
export const ChangelogEntryCard = (props: ChangelogEntryCardProps) => {
  const { entry, index } = props;

  const t = useTranslations('changelog');

  const { title, date, kind, note, items } = entry;
  const heading = { planned: t('comingSoon'), known: t('knownIssues'), release: t('version', { version: title }) }[
    kind
  ];
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
                {item.map((part, j) => {
                  const { kind, text } = part;

                  if (kind === 'bold') {
                    return <strong key={j}>{text}</strong>;
                  }

                  if (kind === 'code') {
                    return (
                      <code key={j} className="changelog-entry__code">
                        {text}
                      </code>
                    );
                  }

                  return <span key={j}>{text}</span>;
                })}
              </li>
            );
          })}
        </ul>
      </section>
    </Arrive>
  );
};
