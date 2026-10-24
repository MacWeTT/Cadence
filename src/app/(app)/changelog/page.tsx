import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ChangelogEntryCard } from '@/components/changelog-entry/changelog-entry';
import { ChangelogLineCard } from '@/components/changelog-line-card/changelog-line-card';
import { LatestUpdateCard } from '@/components/latest-update-card/latest-update-card';
import { PreReleasesCard } from '@/components/pre-releases-card/pre-releases-card';
import { PageTransition } from '@/components/page-transition/page-transition';
import { groupLines, latestUpdate, parseChangelog, splitReleases } from '@/lib/changelog';
import './page.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('changelog');

  return { title: t('title') };
};

/**
 * What's new: what is coming and what is known, the latest update when the newest release is a fix (1.0.1), then one card
 * for each release from 1.0 on, and one card that leads to the pre-releases (0.x, before 1.0), read from CHANGELOG.md, which stays the one place everything is written. Every
 * release, the fixes in between included, is on the "all changes" page.
 */
const ChangelogPage = () => {
  const t = useTranslations('changelog');

  // Read when the page is built, so the file is not needed while the app runs.
  const entries = parseChangelog(readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8'));
  const notes = entries.filter(({ kind, items }) => {
    return (kind === 'planned' || kind === 'known') && items.length > 0;
  });
  const { releases, preReleases } = splitReleases(groupLines(entries));
  const update = latestUpdate(entries);
  const noteCount = notes.length;
  const first = noteCount + (update ? 1 : 0);

  return (
    <PageTransition>
      <div className="changelog">
        <h1 className="changelog__title">{t('title')}</h1>
        <p className="changelog__intro">{t('intro')}</p>
        {notes.map((entry, index) => {
          return <ChangelogEntryCard key={entry.title} entry={entry} index={index} />;
        })}
        {update && <LatestUpdateCard entry={update} index={noteCount} />}
        {releases.map((group, index) => {
          return <ChangelogLineCard key={group.line} group={group} featured={index === 0} index={first + index} />;
        })}
        {preReleases.length > 0 && (
          <PreReleasesCard
            from={preReleases.at(-1)?.line ?? ''}
            to={preReleases[0].line}
            index={first + releases.length}
          />
        )}
        <Link href="/changelog/all" className="changelog__all">
          {t('seeAll')}
        </Link>
      </div>
    </PageTransition>
  );
};

export default ChangelogPage;
