import { useTranslations } from 'next-intl';
import { Arrive } from '@/components/arrive/arrive';
import { InlineText } from '@/components/changelog-entry/inline-text';
import { LineChanges } from '@/components/line-changes/line-changes';
import type { ChangelogEntry } from '@/lib/changelog';
import './latest-update-card.css';

/** How many changes the card itself shows; the complete list is in the window. The notes list the biggest ones first. */
const SHOWN = 3;

interface LatestUpdateCardProps {
  /** The newest release, a run of fixes. */
  entry: ChangelogEntry;
  /** Its place in the list: later cards come in a little after earlier ones. */
  index: number;
}

/** The latest update on What's new: its three biggest changes, and a window with the complete list. */
export const LatestUpdateCard = (props: LatestUpdateCardProps) => {
  const { entry, index } = props;
  const { title, date, note, items } = entry;

  const t = useTranslations('changelog');

  const id = `changelog-update-${title}`;
  const count = items.length;

  return (
    <Arrive index={index}>
      <section aria-labelledby={id} className="latest-update">
        <div className="latest-update__head">
          <h2 id={id} className="latest-update__title">
            {t('latestUpdate', { version: title })}
          </h2>
          {date && <time dateTime={date}>{date}</time>}
        </div>
        {note && <p className="latest-update__note">{note}</p>}
        <ul className="latest-update__items">
          {items.slice(0, SHOWN).map((item, i) => {
            return (
              <li key={i} className="latest-update__item">
                <InlineText parts={item} />
              </li>
            );
          })}
        </ul>
        {count > SHOWN && (
          <LineChanges
            title={t('version', { version: title })}
            openLabel={t('seeAllChanges', { count })}
            description={t('updateNotes', { version: title })}
            releases={[entry]}
          />
        )}
      </section>
    </Arrive>
  );
};
