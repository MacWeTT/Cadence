import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CirclesWelcome } from '@/app/(app)/circles/circles-welcome/circles-welcome';
import { PageTransition } from '@/components/page-transition/page-transition';

/** The page is only a frame: the list is in the layout, and its data comes from the browser's cache, so it opens at once. */
const CirclesPage = () => {
  return (
    <PageTransition>
      <CirclesWelcome />
    </PageTransition>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('circles');

  return { title: t('title') };
};

export default CirclesPage;
