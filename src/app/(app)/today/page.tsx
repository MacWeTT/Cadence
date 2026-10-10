import { Suspense } from 'react';
import { ListSkeleton } from '@/components/list-skeleton/list-skeleton';
import { getTodayView } from '@/server/today';
import { TodayClient } from './today-client/today-client';

const TodayPage = (props: PageProps<'/today'>) => {
  const { searchParams } = props;

  return (
    <Suspense fallback={<ListSkeleton title="Today" />}>
      <TodayContent searchParams={searchParams} />
    </Suspense>
  );
};

export default TodayPage;

interface TodayContentProps {
  searchParams: PageProps<'/today'>['searchParams'];
}

const TodayContent = async (props: TodayContentProps) => {
  const { searchParams } = props;

  const { date } = await searchParams;

  return <TodayClient {...await getTodayView(date)} />;
};
