import { Suspense } from 'react';
import { ListSkeleton } from '@/components/skeleton';
import { getTodayView } from '@/server/today';
import { TodayClient } from './today-client';

export default function TodayPage({ searchParams }: PageProps<'/today'>) {
  return (
    <Suspense fallback={<ListSkeleton title="Today" />}>
      <TodayContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TodayContent({ searchParams }: { searchParams: PageProps<'/today'>['searchParams'] }) {
  const { date } = await searchParams;
  return <TodayClient {...await getTodayView(date)} />;
}
