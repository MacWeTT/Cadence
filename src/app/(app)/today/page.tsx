import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { PageTransition } from '@/components/page-transition/page-transition';
import { TodayClient } from '@/app/(app)/today/today-client/today-client';

/** The page is only a frame: its data comes from the browser's cache (see use-today.ts), so it opens at once. */
const TodayPage = async () => {
  const t = await getTranslations('today');

  return (
    <PageTransition>
      <Suspense fallback={<ListSkeleton title={t('title')} />}>
        <TodayClient />
      </Suspense>
    </PageTransition>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('today');

  return { title: t('title') };
};

export default TodayPage;
