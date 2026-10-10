import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { listHabits } from '@/server/habits';
import { HabitsClient } from './habits-client/habits-client';

const HabitsPage = () => {
  const t = useTranslations('habits');

  return (
    <Suspense fallback={<ListSkeleton title={t('title')} />}>
      <HabitsContent />
    </Suspense>
  );
};

export default HabitsPage;

const HabitsContent = async () => {
  const view = await listHabits();

  return <HabitsClient view={view} />;
};
