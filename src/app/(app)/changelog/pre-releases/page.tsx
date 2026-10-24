import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ChangelogLineCard } from '@/components/changelog-line-card/changelog-line-card';
import { PageTransition } from '@/components/page-transition/page-transition';
import { groupLines, parseChangelog, splitReleases } from '@/lib/changelog';
import '../page.css';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('changelog');

  return { title: t('preTitle') };
};

/** The pre-releases: one card for each version line before 1.0, with its highlights. */
const PreReleasesPage = () => {
  const t = useTranslations('changelog');

  const { preReleases } = splitReleases(
    groupLines(parseChangelog(readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8'))),
  );

  return (
    <PageTransition>
      <div className="changelog">
        <Link href="/changelog" className="changelog__back">
          {t('back')}
        </Link>
        <h1 className="changelog__title">{t('preTitle')}</h1>
        <p className="changelog__intro">{t('preIntro')}</p>
        {preReleases.map((group, index) => {
          return <ChangelogLineCard key={group.line} group={group} featured={false} index={index} />;
        })}
      </div>
    </PageTransition>
  );
};

export default PreReleasesPage;
