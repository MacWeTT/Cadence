import { Suspense } from 'react';
import { ListSkeleton } from '@/components/list-skeleton';
import { listHabits } from '@/server/habits';
import { HabitsClient } from './habits-client';

const HabitsPage = () => {
  return (
    <Suspense fallback={<ListSkeleton title="Habits" />}>
      <HabitsContent />
    </Suspense>
  );
};

export default HabitsPage;

const HabitsContent = async () => {
  const view = await listHabits();

  return <HabitsClient view={view} />;
};
