import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PageTransition } from '@/components/page-transition/page-transition';
import { HabitsClient } from '@/app/(app)/habits/habits-client/habits-client';

/** The page is only a frame: its data comes from the browser's cache (see use-habits.ts), so it opens at once. */
const HabitsPage = () => {
  return (
    <PageTransition>
      <HabitsClient />
    </PageTransition>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('habits');

  return { title: t('title') };
};

export default HabitsPage;
