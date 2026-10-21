import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CirclesClient } from '@/app/(app)/circles/circles-client/circles-client';
import { PageTransition } from '@/components/page-transition/page-transition';

/** The page is only a frame: its data comes from the browser's cache (see use-circles.ts), so it opens at once. */
const CirclesPage = () => {
  return (
    <PageTransition>
      <CirclesClient />
    </PageTransition>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('circles');

  return { title: t('title') };
};

export default CirclesPage;
