import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ChangelogEntryCard } from '@/components/changelog-entry/changelog-entry';
import { PageTransition } from '@/components/page-transition/page-transition';
import { parseChangelog } from '@/lib/changelog';
import '../page.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('changelog');

  return { title: t('allTitle') };
};

/** Every release in full, newest first: what the What's new page's cards summarise. */
const AllChangesPage = () => {
  const t = useTranslations('changelog');

  const releases = parseChangelog(readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8')).filter(({ kind }) => {
    return kind === 'release';
  });

  return (
    <PageTransition>
      <div className="changelog">
        <Link href="/changelog" className="changelog__back">
          {t('back')}
        </Link>
        <h1 className="changelog__title">{t('allTitle')}</h1>
        <p className="changelog__intro">{t('allIntro')}</p>
        {releases.map((entry, index) => {
          return <ChangelogEntryCard key={entry.title} entry={entry} index={index} />;
        })}
      </div>
    </PageTransition>
  );
};

export default AllChangesPage;
