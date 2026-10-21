import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CircleClient } from '@/app/(app)/circles/circle-client/circle-client';
import { PageTransition } from '@/components/page-transition/page-transition';

// A circle's address carries its id (and an invite's its token), which is only known when someone asks for it, so this
// route cannot be built ahead of time and is allowed to render when requested.
export const instant = false;

/** The page is only a frame: the circle comes from the browser's cache (see use-circles.ts). */
const CirclePage = async (props: PageProps<'/circles/[id]'>) => {
  const { id } = await props.params;

  return (
    <PageTransition>
      <CircleClient id={id} />
    </PageTransition>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('circles');

  return { title: t('title') };
};

export default CirclePage;
