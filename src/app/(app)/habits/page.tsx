import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { PageTransition } from '@/components/page-transition/page-transition';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { listHabits } from '@/server/habits';
import { HabitsClient } from './habits-client/habits-client';

const HabitsPage = () => {
  const t = useTranslations('habits');

  return (
    <PageTransition fallback={<ListSkeleton title={t('title')} />}>
      <HabitsContent />
    </PageTransition>
  );
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('habits');

  return { title: t('title') };
};

export default HabitsPage;

const HabitsContent = async () => {
  const view = await listHabits();

  return <HabitsClient view={view} />;
};
