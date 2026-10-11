import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ChangelogEntryCard } from '@/components/changelog-entry/changelog-entry';
import { PageTransition } from '@/components/page-transition/page-transition';
import { parseChangelog } from '@/lib/changelog';
import './page.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('changelog');

  return { title: t('title') };
};

/** What's new: the releases and the plans, read from CHANGELOG.md, which stays the one place they are written. */
const ChangelogPage = () => {
  const t = useTranslations('changelog');

  // Read when the page is built, so the file is not needed while the app runs.
  const entries = parseChangelog(readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8'));

  return (
    <PageTransition>
      <div className="changelog">
        <h1 className="changelog__title">{t('title')}</h1>
        <p className="changelog__intro">{t('intro')}</p>
        {entries.map((entry, index) => {
          return <ChangelogEntryCard key={entry.title} entry={entry} index={index} />;
        })}
      </div>
    </PageTransition>
  );
};

export default ChangelogPage;
